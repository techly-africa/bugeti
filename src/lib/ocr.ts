import { OcrResult } from "./types";

/**
 * Extracts amount, date, and merchant from a receipt image using Tesseract.js.
 * Optimized for MTN MoMo and Bank of Kigali receipt formats.
 */
export async function extractReceiptData(
  file: File,
  onProgress?: (progress: number) => void
): Promise<OcrResult> {
  // Dynamically import Tesseract to avoid SSR issues
  const Tesseract = (await import("tesseract.js")).default;

  const result = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  const text = result.data.text;
  const confidence = result.data.confidence;

  return {
    raw_text: text,
    confidence,
    amount: extractAmount(text),
    date: extractDate(text),
    merchant: extractMerchant(text),
  };
}

// ─── Amount Extraction ────────────────────────────────────────────────────────

function extractAmount(text: string): number | undefined {
  // Patterns for RWF amounts in MoMo / bank receipts
  const patterns = [
    // MTN MoMo: "Amount: 5,000 RWF" or "RWF 5,000"
    /(?:amount|amafaranga)[:\s]+(\d[,\d]*)\s*(?:rwf|frw)?/i,
    /(?:rwf|frw)\s*(\d[,\d]*)/i,
    /(\d[,\d]*)\s*(?:rwf|frw)/i,
    // Equity / BK: "5000 RWF" plain
    /\b(\d{3,}(?:,\d{3})*)\b/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      const raw = match[1].replaceAll(",", "");
      const value = Number.parseInt(raw, 10);
      if (!Number.isNaN(value) && value > 0 && value < 100_000_000) {
        return value;
      }
    }
  }
  return undefined;
}

// ─── Date Extraction ──────────────────────────────────────────────────────────

function extractDate(text: string): string | undefined {
  const patterns = [
    // 2024-01-15 or 15/01/2024 or 15-01-2024
    /\b(\d{4}[-/]\d{2}[-/]\d{2})\b/,
    /\b(\d{2}[-/]\d{2}[-/]\d{4})\b/,
    // "Jan 15, 2024" or "15 Jan 2024"
    /\b(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{4})\b/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      try {
        const d = new Date(match[1]);
        if (!Number.isNaN(d.getTime())) {
          return d.toISOString().split("T")[0];
        }
      } catch {
        continue;
      }
    }
  }
  return undefined; // let the user fill in the date rather than silently misdating
}

// ─── Merchant Extraction ──────────────────────────────────────────────────────

function extractMerchant(text: string): string | undefined {
  // Look for common Rwandan merchant patterns
  const patterns = [
    /(?:merchant|to|from|recipient)[:\s]+([A-Za-z\d\s&'-]+)/i,
    /(?:momo pay|mobile money|mtn)[:\s]+([A-Za-z\d\s&'-]+)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match) {
      return match[1].trim().slice(0, 50);
    }
  }
  return undefined;
}
