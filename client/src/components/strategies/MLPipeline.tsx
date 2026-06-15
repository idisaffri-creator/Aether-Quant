import { useState } from "react";
import {
  Brain, BarChart3, CheckCircle2, Clock, AlertCircle, Play, ChevronDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

interface Stage {
  id: string;
  label: string;
  icon: typeof Brain;
  status: "pending" | "running" | "complete" | "error";
  description: string;
}

interface Feature {
  name: string;
  importance: number;
}

interface ModelVersion {
  id: string;
  label: string;
  accuracy: number;
  precision: number;
  f1: number;
}

const initialStages: Stage[] = [
  { id: "features", label: "Feature Engineering", icon: BarChart3, status: "complete", description: "Extract and select predictive features from market data" },
  { id: "training", label: "Model Training", icon: Brain, status: "complete", description: "Train ensemble of models on labeled data" },
  { id: "validation", label: "Validation", icon: CheckCircle2, status: "pending", description: "Validate model performance on out-of-sample data" },
  { id: "deployment", label: "Deployment", icon: Play, status: "pending", description: "Deploy model to production trading pipeline" },
];

const mockFeatures: Feature[] = [
  { name: "RSI(14)", importance: 0.92 },
  { name: "EMA Cross", importance: 0.87 },
  { name: "Volume ROC", importance: 0.81 },
  { name: "ATR(14)", importance: 0.76 },
  { name: "MACD", importance: 0.71 },
  { name: "Bollinger %B", importance: 0.65 },
  { name: "OBV", importance: 0.58 },
  { name: "Stochastic K", importance: 0.52 },
  { name: "ADX(14)", importance: 0.45 },
  { name: "Ichimoku", importance: 0.38 },
];

const modelVersions: ModelVersion[] = [
  { id: "v3", label: "v3.2 — XGBoost Ensemble", accuracy: 0.742, precision: 0.71, f1: 0.69 },
  { id: "v2", label: "v2.1 — Random Forest", accuracy: 0.688, precision: 0.65, f1: 0.63 },
  { id: "v1", label: "v1.0 — Logistic Regression", accuracy: 0.612, precision: 0.59, f1: 0.57 },
];

const stageConnections = [
  { from: "features", to: "training" },
  { from: "training", to: "validation" },
  { from: "validation", to: "deployment" },
];

function StageIcon({ status }: { status: Stage["status"] }) {
  if (status === "complete") return <CheckCircle2 className="w-5 h-5 text-green-500" />;
  if (status === "running") return <Clock className="w-5 h-5 text-amber animate-pulse" />;
  if (status === "error") return <AlertCircle className="w-5 h-5 text-red-500" />;
  return <Clock className="w-5 h-5 text-muted-foreground" />;
}

export default function MLPipeline() {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [training, setTraining] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(modelVersions[0].id);

  const trainModel = async () => {
    setTraining(true);
    setStages((prev) =>
      prev.map((s) =>
        s.id === "training" ? { ...s, status: "running" as const } : s.id === "features" ? { ...s, status: "complete" as const } : s
      )
    );
    await new Promise((r) => setTimeout(r, 2000));
    setStages((prev) =>
      prev.map((s) =>
        s.id === "training"
          ? { ...s, status: "complete" as const }
          : s.id === "validation"
          ? { ...s, status: "running" as const }
          : s
      )
    );
    await new Promise((r) => setTimeout(r, 1500));
    setStages((prev) =>
      prev.map((s) =>
        s.id === "validation"
          ? { ...s, status: "complete" as const }
          : s.id === "deployment"
          ? { ...s, status: "running" as const }
          : s
      )
    );
    await new Promise((r) => setTimeout(r, 1000));
    setStages((prev) =>
      prev.map((s) => (s.id === "deployment" ? { ...s, status: "complete" as const } : s))
    );
    setTraining(false);
  };

  const currentVersion = modelVersions.find((v) => v.id === selectedVersion) || modelVersions[0];

  return (
    <div className="space-y-6">
      {/* Pipeline Stages */}
      <div className="glass-card rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-4">Pipeline</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stages.map((stage, i) => (
            <div key={stage.id}>
              <div
                className={`rounded-xl p-3.5 space-y-2 border transition-all ${
                  stage.status === "complete"
                    ? "border-green-500/30 bg-green-500/5"
                    : stage.status === "running"
                    ? "border-amber/30 bg-amber/5"
                    : stage.status === "error"
                    ? "border-red-500/30 bg-red-500/5"
                    : "border-border/50 bg-accent/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <stage.icon className="w-4 h-4 text-muted-foreground" />
                  <StageIcon status={stage.status} />
                </div>
                <div>
                  <div className="text-sm font-semibold">{stage.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{stage.description}</div>
                </div>
                <div className="text-[10px] font-medium uppercase tracking-wider">
                  {stage.status}
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="hidden sm:flex justify-center py-1">
                  <div className="w-px h-3 bg-border/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Feature Importance + Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Feature Importance</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockFeatures} layout="vertical">
                <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 10 }} stroke="oklch(1 0 0 / 20%)" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="oklch(1 0 0 / 20%)" width={80} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.15 0.009 260)",
                    border: "1px solid oklch(1 0 0 / 8%)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [(value * 100).toFixed(0) + "%", "Importance"]}
                />
                <Bar dataKey="importance" fill="oklch(0.72 0.18 60)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Model Performance</h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="bg-accent/30 rounded px-2 py-1 text-xs border border-border/50 outline-none"
              >
                {modelVersions.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-accent/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Accuracy</div>
              <div className="text-lg font-display font-bold text-amber">{(currentVersion.accuracy * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-accent/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Precision</div>
              <div className="text-lg font-display font-bold text-green-500">{(currentVersion.precision * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-accent/30 rounded-lg p-3 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">F1 Score</div>
              <div className="text-lg font-display font-bold text-blue-500">{(currentVersion.f1 * 100).toFixed(1)}%</div>
            </div>
          </div>
          <button
            onClick={trainModel}
            disabled={training}
            className="btn-amber px-4 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 w-full disabled:opacity-50"
          >
            {training ? (
              <><Clock className="w-4 h-4 animate-spin" /> Training...</>
            ) : (
              <><Play className="w-4 h-4" /> Train Model</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
