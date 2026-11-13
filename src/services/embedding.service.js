import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

export async function embedding(data) {
  const ai = new GoogleGenAI({ apiKey: process.env.googleApiKey });
  // en el content debe ir UNICAMENTE texto, podemos pasarle variables siempre y cuando estas esten concatenadas al texto o metidas dentro de un backtic
  // ej: `${variable}`
  const response = await ai.models.embedContent({
    model: "gemini-embedding-2",
    contents: `${data}`,
    config: { outputDimensionality: 768 },
  });
  return response.embeddings[0].values
}


export async function reranker(request, queryData){
 return fetch('https://api.jina.ai/v1/rerank', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.jinaApiKey}`
  },
  body: JSON.stringify({
    documents: queryData,
    model: 'jina-reranker-v2-base-multilingual',
    query: request,
    return_documents: true,
    top_n: 1
  })
})
}