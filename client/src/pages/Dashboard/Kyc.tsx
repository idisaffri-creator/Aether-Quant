/*
 * KYC document upload — file picker, upload progress, document list.
 */
import { useState, useEffect, useRef } from "react";
import { usePageTitle } from "@/lib/usePageTitle";
import { motion } from "framer-motion";
import { Shield, Upload, FileText, Trash2, Download, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface KycObject {
  key: string;
  size: number;
  lastModified: string;
}

const DOC_TYPES = [
  { value: "passport", label: "Passport" },
  { value: "drivers_license", label: "Driver's License" },
  { value: "national_id", label: "National ID" },
  { value: "proof_of_address", label: "Proof of Address" },
  { value: "selfie", label: "Selfie / Identity Verification" },
];

export default function Kyc() {
  usePageTitle("KYC Verification");
  const [objects, setObjects] = useState<KycObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [docType, setDocType] = useState("passport");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    try {
      const [status, list] = await Promise.all([
        api.storage.status(),
        api.kyc.documents(),
      ]);
      setConfigured(status.configured);
      setObjects(list.objects || []);
    } catch (err) {
      toast.error("Failed to load KYC documents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleUpload(file: File) {
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File too large (max 25MB)");
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("docType", docType);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      setUploading(false);
      setUploadProgress(0);
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success("Document uploaded");
        load();
      } else {
        try {
          const j = JSON.parse(xhr.responseText);
          toast.error(j.message || "Upload failed");
        } catch {
          toast.error("Upload failed");
        }
      }
    });
    xhr.addEventListener("error", () => {
      setUploading(false);
      toast.error("Upload failed (network error)");
    });
    xhr.open("POST", "/api/storage/kyc/upload");
    const token = localStorage.getItem("token") || "";
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  }

  async function downloadDoc(key: string) {
    try {
      const r = await fetch(`/api/storage/kyc/download-url?key=${encodeURIComponent(key)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!r.ok) throw new Error("Failed to get URL");
      const j = await r.json();
      window.open(j.url, "_blank");
    } catch (err) {
      toast.error("Download failed");
    }
  }

  async function deleteDoc(key: string) {
    if (!confirm("Delete this document?")) return;
    try {
      const r = await fetch("/api/storage/kyc", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ key }),
      });
      if (r.ok) {
        toast.success("Deleted");
        load();
      } else {
        toast.error("Delete failed");
      }
    } catch (err) {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-7 h-7 text-primary" /> KYC Verification
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Upload identity documents for live trading verification.</p>
      </div>

      {!configured ? (
        <div className="glass-card rounded-xl p-6 border-l-2 border-l-amber-500 bg-amber-500/5">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <div className="font-display font-semibold">Object storage not configured</div>
              <div className="text-sm text-muted-foreground mt-1">Set S3_SECRET_KEY env var to enable document upload. Or use the in-form KYC submission for the demo flow.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Document type</label>
              <select value={docType} onChange={e => setDocType(e.target.value)} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm">
                {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">File (max 25MB)</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
                className="block w-full text-sm text-muted-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground file:cursor-pointer hover:file:bg-primary/90"
              />
            </div>
          </div>
          {uploading && (
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-card rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-display font-semibold">Your documents ({objects.length})</h3>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : objects.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">No documents uploaded yet.</div>
        ) : (
          <div className="space-y-2">
            {objects.map(o => {
              const docType = o.key.split("/")[2] || "other";
              const fileName = o.key.split("/").pop() || o.key;
              const dt = DOC_TYPES.find(d => d.value === docType);
              return (
                <div key={o.key} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg">
                  <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{dt?.label || docType}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {fileName} · {(o.size / 1024).toFixed(1)}KB · {new Date(o.lastModified).toLocaleString()}
                    </div>
                  </div>
                  <button onClick={() => downloadDoc(o.key)} className="p-2 rounded hover:bg-accent/50 text-muted-foreground hover:text-foreground" title="Download">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => deleteDoc(o.key)} className="p-2 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-400" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
