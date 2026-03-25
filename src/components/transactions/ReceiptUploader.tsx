"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { ImageIcon, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractReceiptData } from "@/lib/ocr";
import { OcrResult } from "@/lib/types";
import { useT } from "@/hooks/useT";

interface ReceiptUploaderProps {
  onExtracted: (result: OcrResult, file: File) => void;
}

export function ReceiptUploader({ onExtracted }: ReceiptUploaderProps) {
  const t = useT();
  const [status, setStatus] = useState<"idle" | "scanning" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);

  const processFile = useCallback(
    async (file: File) => {
      setPreview(URL.createObjectURL(file));
      setStatus("scanning");
      setProgress(0);

      const result = await extractReceiptData(file, (p) => setProgress(p));
      setStatus("done");
      onExtracted(result, file);
    },
    [onExtracted]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: 1,
    onDrop: (files) => {
      if (files[0]) processFile(files[0]);
    },
  });

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-xl border-2 border-dashed p-6
          flex flex-col items-center justify-center gap-2 cursor-pointer
          transition-colors
          ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:border-primary/50"}
        `}
      >
        <input {...getInputProps()} />

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="receipt preview"
            className="max-h-48 object-contain rounded-lg"
          />
        ) : (
          <>
            <ImageIcon size={32} className="text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              {t("uploadReceipt")}
            </p>
            <p className="text-xs text-muted-foreground/70">
              MoMo, bank slip, any screenshot
            </p>
          </>
        )}

        {/* Scanning overlay */}
        {status === "scanning" && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3">
            <Loader2 size={28} className="animate-spin text-primary" />
            <p className="text-sm font-medium">{t("scanning")}</p>
            <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        )}

        {/* Done indicator */}
        {status === "done" && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-500 text-white text-xs font-medium px-2 py-1 rounded-full">
            <CheckCircle2 size={12} />
            {t("scanComplete")}
          </div>
        )}
      </div>

      {status !== "idle" && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => {
            setStatus("idle");
            setPreview(null);
            setProgress(0);
          }}
        >
          Clear & try again
        </Button>
      )}
    </div>
  );
}
