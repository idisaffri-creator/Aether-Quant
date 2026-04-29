/*
 * Idea Extractor – Void Terminal
 * Tabs: Text, YouTube, PDF/Doc, Code
 * Simulated AI extraction flow with loading animation
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Youtube,
  FileUp,
  Code2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Edit3,
  Play,
  Copy,
  RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663489353166/Smb5wRr5wwDpFtVfRrnNA3/data-flow-J8ApvwRFTX9fv6uWyXaFVB.webp";

const sampleText = `When crude oil RSI drops below 30 on the daily chart and the 20-day moving average crosses above the 50-day moving average, go long CL futures with a stop loss at 2 ATR below entry. Take profit when RSI reaches 70 or price hits the upper Bollinger Band. Use a position size of 2% of portfolio.`;

const sampleCode = `# Pine Script Strategy
//@version=5
strategy("CL Mean Reversion", overlay=true)

length = input(20, "Lookback Period")
rsiLen = input(14, "RSI Length")
rsiOB = input(70, "RSI Overbought")
rsiOS = input(30, "RSI Oversold")

rsi = ta.rsi(close, rsiLen)
sma20 = ta.sma(close, 20)
sma50 = ta.sma(close, 50)
atr = ta.atr(14)

longCondition = rsi < rsiOS and ta.crossover(sma20, sma50)
exitCondition = rsi > rsiOB

if (longCondition)
    strategy.entry("Long", strategy.long)
    strategy.exit("SL", "Long", stop=close - 2*atr)

if (exitCondition)
    strategy.close("Long")`;

interface ExtractedStrategy {
  asset: string;
  timeframe: string;
  entry: string;
  exit: string;
  summary: string;
  parameters: { name: string; value: string }[];
}

const mockExtraction: ExtractedStrategy = {
  asset: "CL (WTI Crude Oil Futures)",
  timeframe: "Daily (1D)",
  entry: "RSI(14) < 30 AND SMA(20) crosses above SMA(50)",
  exit: "RSI(14) > 70 OR Price >= Upper Bollinger Band(20, 2)",
  summary:
    "A mean reversion strategy on WTI Crude Oil that enters long positions when the market is oversold (RSI below 30) with a bullish moving average crossover confirmation. The strategy uses ATR-based stop losses and exits on overbought conditions or Bollinger Band resistance.",
  parameters: [
    { name: "RSI Length", value: "14" },
    { name: "RSI Oversold", value: "30" },
    { name: "RSI Overbought", value: "70" },
    { name: "SMA Fast", value: "20" },
    { name: "SMA Slow", value: "50" },
    { name: "Stop Loss (ATR)", value: "2.0" },
    { name: "Position Size", value: "2%" },
  ],
};

const extractionSteps = [
  "Parsing input text...",
  "Identifying asset class and instrument...",
  "Extracting entry conditions...",
  "Extracting exit conditions...",
  "Mapping parameters...",
  "Generating strategy summary...",
  "Validating strategy definition...",
];

export default function IdeaExtractor() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("text");
  const [textInput, setTextInput] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [extracted, setExtracted] = useState<ExtractedStrategy | null>(null);

  const runExtraction = useCallback(() => {
    setIsExtracting(true);
    setExtracted(null);
    setCurrentStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setCurrentStep(step);
      if (step >= extractionSteps.length) {
        clearInterval(interval);
        setTimeout(() => {
          setIsExtracting(false);
          setExtracted(mockExtraction);
          toast.success("Strategy extracted successfully!");
        }, 400);
      }
    }, 500);
  }, []);

  const handleExtract = () => {
    if (activeTab === "text" && !textInput.trim()) {
      toast.error("Please enter a trading idea");
      return;
    }
    if (activeTab === "youtube" && !youtubeUrl.trim()) {
      toast.error("Please enter a YouTube URL");
      return;
    }
    if (activeTab === "code" && !codeInput.trim()) {
      toast.error("Please enter strategy code");
      return;
    }
    runExtraction();
  };

  const handleReset = () => {
    setExtracted(null);
    setIsExtracting(false);
    setCurrentStep(0);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page header with hero image */}
      <div className="relative rounded-xl overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="relative p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">
              Idea Extractor
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Convert any trading idea into a structured, backtestable strategy.
              Paste text, a YouTube URL, upload a document, or enter code — our
              AI extracts Asset, Timeframe, Entry, and Exit conditions
              automatically.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Input Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full bg-secondary/50 mb-4">
                  <TabsTrigger value="text" className="flex-1 gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5" />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="youtube" className="flex-1 gap-1.5 text-xs">
                    <Youtube className="w-3.5 h-3.5" />
                    YouTube
                  </TabsTrigger>
                  <TabsTrigger value="pdf" className="flex-1 gap-1.5 text-xs">
                    <FileUp className="w-3.5 h-3.5" />
                    PDF/Doc
                  </TabsTrigger>
                  <TabsTrigger value="code" className="flex-1 gap-1.5 text-xs">
                    <Code2 className="w-3.5 h-3.5" />
                    Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="text" className="mt-0">
                  <div className="space-y-3">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Describe your trading idea in plain English..."
                      className="w-full h-48 bg-input border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 font-sans"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setTextInput(sampleText)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Load Sample
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="youtube" className="mt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Youtube className="w-5 h-5 text-loss shrink-0" />
                      <input
                        type="url"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        placeholder="https://youtube.com/watch?v=..."
                        className="flex-1 bg-input border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      We'll fetch the transcript and extract trading strategies
                      from the video content.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setYoutubeUrl("https://youtube.com/watch?v=dQw4w9WgXcQ")
                      }
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Load Sample URL
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="pdf" className="mt-0">
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/30 transition-colors">
                      <FileUp className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Drag & drop your PDF or document here
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        Supports PDF, DOCX, TXT (max 10MB)
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-xs"
                        onClick={() => toast.info("File upload simulated — using sample data")}
                      >
                        Browse Files
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="code" className="mt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Pine Script
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Python
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        MQL5
                      </Badge>
                    </div>
                    <textarea
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value)}
                      placeholder="Paste your strategy code here..."
                      className="w-full h-48 bg-input border border-border rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 font-mono leading-relaxed"
                      spellCheck={false}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setCodeInput(sampleCode)}
                    >
                      <Copy className="w-3 h-3 mr-1" />
                      Load Sample Code
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Extract Button */}
              <div className="mt-4 flex gap-2">
                <Button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Extracting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Extract & Generate Strategy
                    </>
                  )}
                </Button>
                {extracted && (
                  <Button variant="outline" size="icon" onClick={handleReset}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Output Panel */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-display font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                Strategy Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {isExtracting ? (
                  <motion.div
                    key="extracting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {extractionSteps.map((step, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{
                          opacity: i <= currentStep ? 1 : 0.3,
                          x: 0,
                        }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center gap-3"
                      >
                        {i < currentStep ? (
                          <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />
                        ) : i === currentStep ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {step}
                        </span>
                      </motion.div>
                    ))}
                    {/* Scanline animation */}
                    <div className="mt-4 h-1 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-primary rounded-full animate-scanline" />
                    </div>
                  </motion.div>
                ) : extracted ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Strategy Insight */}
                    <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                      <p className="text-xs text-primary font-display font-semibold mb-1.5">
                        Strategy Insight
                      </p>
                      <p className="text-sm text-foreground/80 leading-relaxed">
                        {extracted.summary}
                      </p>
                    </div>

                    {/* ATEE Grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          Asset
                        </p>
                        <p className="text-sm font-mono font-semibold text-foreground">
                          {extracted.asset}
                        </p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          Timeframe
                        </p>
                        <p className="text-sm font-mono font-semibold text-foreground">
                          {extracted.timeframe}
                        </p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg col-span-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          Entry Condition
                        </p>
                        <p className="text-sm font-mono text-profit">
                          {extracted.entry}
                        </p>
                      </div>
                      <div className="p-3 bg-secondary/50 rounded-lg col-span-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                          Exit Condition
                        </p>
                        <p className="text-sm font-mono text-loss">
                          {extracted.exit}
                        </p>
                      </div>
                    </div>

                    {/* Parameters */}
                    <div>
                      <p className="text-xs text-muted-foreground font-display font-semibold mb-2 flex items-center gap-1.5">
                        <Edit3 className="w-3 h-3" />
                        Editable Parameters
                      </p>
                      <div className="space-y-1.5">
                        {extracted.parameters.map((param) => (
                          <div
                            key={param.name}
                            className="flex items-center justify-between py-1.5 px-3 bg-secondary/30 rounded-md"
                          >
                            <span className="text-xs text-muted-foreground">
                              {param.name}
                            </span>
                            <input
                              defaultValue={param.value}
                              className="w-16 text-right text-xs font-mono text-foreground bg-transparent border-b border-border/50 focus:border-primary focus:outline-none py-0.5"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => setLocation("/backtest")}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-display font-semibold"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Run Backtest
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          toast.success("Strategy saved to library!")
                        }
                      >
                        Save
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-16 text-center"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                      <ArrowRight className="w-6 h-6 text-primary/40" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      No strategy extracted yet
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      Enter a trading idea and click Extract to begin
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
