import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import { GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { z } from 'zod';
import { JSDOM } from 'jsdom';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ---------- Mongo ----------
const mongo = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 });
const db = () => mongo.db(process.env.MONGODB_DB);
const col = () => db().collection(process.env.MONGODB_COLLECTION);

// ---------- Gemini ----------
const EMBED_MODEL = 'text-embedding-004'; // 768 dims
const CHAT_MODEL  = 'gemini-2.5-flash';

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: EMBED_MODEL,
  apiKey: process.env.GOOGLE_API_KEY
});

const llm = new ChatGoogleGenerativeAI({
  model: CHAT_MODEL,
  temperature: 0.3,
  apiKey: process.env.GOOGLE_API_KEY
});

// ---------- helpers ----------
function chunkText(text, size = 900, overlap = 120) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + size));
    i += (size - overlap);
  }
  return chunks;
}

async function fetchAndExtract(url) {
  const html = await (await fetch(url)).text();
  const dom = new JSDOM(html);
  const content = dom.window.document.querySelector('#content')?.textContent
    || dom.window.document.body.textContent
    || '';
  return content.replace(/\s+/g, ' ').trim();
}

async function upsertDocs(docs) {
  if (!docs.length) return;
  const operations = docs.map((d, i) => ({
    updateOne: {
      filter: { url: d.url, pos: d.pos ?? i },
      update: { $set: d },
      upsert: true
    }
  }));
  await col().bulkWrite(operations, { ordered: false });
}

// ---------- routes ----------

// Health
app.get('/healthz', (_req, res) => res.json({ ok: true }));

// RAG ask
app.post('/ask', async (req, res) => {
  try {
    const schema = z.object({
      query: z.string().min(3),
      city: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional()
    });
    const { query, city, category, tags } = schema.parse(req.body);

    await mongo.connect();
    const qVec = await embeddings.embedQuery(query);

    const pipeline = [
      {
        $vectorSearch: {
          index: process.env.VECTOR_INDEX_NAME,
          path: "embedding",
          queryVector: qVec,
          numCandidates: 200,
          limit: 8
        }
      },
      ...(city ? [{ $match: { city } }] : []),
      ...(category ? [{ $match: { category } }] : []),
      ...(tags && tags.length > 0 ? [{ $match: { "meta.tags": { $all: tags } } }] : []),
      {
        $project: {
          chunk: 1,
          url: 1,
          city: 1,
          category: 1,
          meta: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    const docs = await col().aggregate(pipeline).toArray();

    const context = docs.map((d, i) => `[[DOC ${i+1}]] ${d.chunk}\nSRC: ${d.url || ''}`).join('\n\n');

    const sys = `You are Transiter. Base your answers only on CONTEXT below. If the user’s wording doesn’t exactly match, look for equivalent concepts (e.g., 2-day = 48 hours). If truly no relevant info exists in CONTEXT, say you don't know. Be concise with bullet points. Include pass names, durations, coverage, and prices if present.`;
    const prompt = `${sys}\n\nCONTEXT:\n${context}\n\nQUESTION:\n${query}`;

    const ai = await llm.invoke(prompt);
    const text = typeof ai.content === 'string' ? ai.content : (ai.content?.[0]?.text ?? '');

    res.json({
      answer: text,
      sources: docs.slice(0, 5).map(d => d.url).filter(Boolean)
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// Admin: ingest URLs
app.post('/admin/ingest/url', async (req, res) => {
  try {
    if (req.headers['x-admin-token'] !== process.env.ADMIN_TOKEN) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const schema = z.object({
    city: z.string().min(2),
    category: z.string().default("Transit"),
    urls: z.array(z.string().url()).min(1),
    tags: z.array(z.string()).optional()
    });
    const { city, category, urls, tags } = schema.parse(req.body);

    await mongo.connect();

    // fetch -> chunk -> embed -> upsert
    let total = 0;
    for (const url of urls) {
    // fetch HTML and extract text + title
    const html = await (await fetch(url)).text();
    const dom = new JSDOM(html);
    const title =
        dom.window.document.querySelector("h1")?.textContent?.trim() ||
        dom.window.document.querySelector("title")?.textContent?.trim() ||
        "General";
    const bodyText =
        dom.window.document.querySelector("#content")?.textContent ||
        dom.window.document.body.textContent ||
        "";
    const text = bodyText.replace(/\s+/g, " ").trim();

    // chunk + embed
    const chunks = chunkText(text);
    const embeds = await embeddings.embedDocuments(chunks);

    const docs = chunks.map((c, i) => ({
        city,
        category,
        url,
        chunk: c,
        meta: {
        section: title,        // auto-tagged from <h1> or <title>
        tags: tags || []       // whatever was passed in request body
        },
        pos: i,
        embedding: embeds[i]
    }));

    await upsertDocs(docs);
    total += docs.length;
    }

    res.json({ ok: true, ingestedChunks: total });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`API listening on :${port}`));
