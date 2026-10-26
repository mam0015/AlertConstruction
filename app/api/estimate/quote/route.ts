import { getEstimatePrices } from "../../../../db/estimate-store";
import { analyseQuote, parseQuoteInput, reviewQuote } from "../../../estimate-tools/ai.mjs";
import { aiFailure, aiGate, json, readBody } from "../../../estimate-tools/server";

// Quote price check: reads a trade's quote and compares each line with the company price list. Lines more than $100 away from the company's
// own price are flagged. The AI only reads the quote; the comparison is arithmetic on the company's saved prices.
export async function POST(request: Request) {
  const gate = await aiGate(request);
  if ("response" in gate) return gate.response;
  try {
    const input = parseQuoteInput(await readBody(request));
    const [result, prices] = await Promise.all([analyseQuote({ client: gate.client, model: gate.model, input, useFallbacks: gate.useFallbacks }), getEstimatePrices()]);
    const reviewed = reviewQuote(result.analysis, input.trade, (index: number) => {
      const cents = prices.rates[input.trade.keys[index]];
      return typeof cents === "number" ? cents / 100 : null;
    });
    console.info(JSON.stringify({ estimate: "quote", trade: input.trade.id, items: reviewed.items.length, usage: result.usage }));
    return json({ analysis: reviewed, model: result.model });
  } catch (error) {
    return aiFailure(error);
  }
}

const notAllowed = () => Response.json({ error: "That method is not allowed here." }, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
export const GET = notAllowed;
export const PUT = notAllowed;
export const PATCH = notAllowed;
export const DELETE = notAllowed;
