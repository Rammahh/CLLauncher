import { useState, useRef, useEffect } from "react";
import { useLogStore, type LogEntry, type LogLevel } from "@/store/logStore";
import { useInstanceStore } from "@/store/instanceStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Copy, FolderOpen, Archive, Trash2, ChevronDown,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { downloadDir } from "@tauri-apps/api/path";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const levelColors: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  warn: "text-launcher-orange",
  error: "text-launcher-red",
  debug: "text-launcher-blue",
  game: "text-foreground/70",
};

const levelLabels: Record<LogLevel, string> = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
  debug: "DEBUG",
  game: "GAME",
};

function LogLine({ entry }: { entry: LogEntry }) {
  return (
    <div className={cn("flex items-start gap-2 py-0.5 hover:bg-launcher-bg-hover px-3 text-xs font-mono")}>
      <span className="text-muted-foreground/50 shrink-0 w-24 truncate">
        {entry.timestamp.slice(11, 23)}
      </span>
      <span className={cn("shrink-0 w-12", levelColors[entry.level])}>
        {levelLabels[entry.level]}
      </span>
      <span className="text-muted-foreground shrink-0 w-20 truncate">
        {entry.source}
      </span>
      <span className={cn("flex-1 break-all whitespace-pre-wrap", levelColors[entry.level])}>
        {entry.message}
      </span>
    </div>
  );
}

function LogViewer({ entries, onClear }: { entries: LogEntry[]; onClear: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const filtered = filter
    ? entries.filter(
        (e) =>
          e.message.toLowerCase().includes(filter.toLowerCase()) ||
          e.source.toLowerCase().includes(filter.toLowerCase())
      )
    : entries;

  const copyAll = () => {
    const text = filtered
      .map((e) => `[${e.timestamp}] [${levelLabels[e.level]}] [${e.source}] ${e.message}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Logs copied", variant: "success" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-launcher-border bg-launcher-bg-secondary shrink-0">
        <Input
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-7 text-xs w-48"
        />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAutoScroll((v) => !v)}
          className={cn("text-xs h-7", autoScroll && "text-launcher-green")}
        >
          <ChevronDown className="w-3 h-3 mr-1" />
          Auto-scroll
        </Button>
        <Button variant="ghost" size="sm" onClick={copyAll} className="h-7">
          <Copy className="w-3 h-3" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear} className="h-7 text-muted-foreground hover:text-launcher-red">
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto bg-launcher-bg-primary"
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10;
          setAutoScroll(atBottom);
        }}
      >
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 p-4">No log entries.</p>
        ) : (
          filtered.map((entry) => <LogLine key={entry.id} entry={entry} />)
        )}
      </div>
    </div>
  );
}

export function LogsPage() {
  const launcherLogs = useLogStore((s) => s.launcherLogs);
  const gameLogs = useLogStore((s) => s.gameLogs);
  const clearLauncherLogs = useLogStore((s) => s.clearLauncherLogs);
  const clearGameLogs = useLogStore((s) => s.clearGameLogs);
  const instances = useInstanceStore((s) => Object.values(s.instances));
  const [selectedInstance, setSelectedInstance] = useState<string | null>(
    instances[0]?.id ?? null
  );

  const handleOpenLogsFolder = async () => {
    try {
      await invoke("open_logs_folder");
    } catch (e) {
      toast({ title: "Could not open logs folder", variant: "error" });
    }
  };

  const handleExportZip = async () => {
    try {
      const dir = await downloadDir();
      const path = `${dir}cllauncher-logs.zip`;
      await invoke("export_logs_zip", { destPath: path });
      toast({ title: "Logs exported", description: path, variant: "success" });
    } catch (e) {
      toast({ title: "Export failed", description: String(e), variant: "error" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-launcher-border shrink-0">
        <h1 className="text-lg font-semibold">Logs</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleOpenLogsFolder}>
            <FolderOpen className="w-4 h-4 mr-1" />
            Open folder
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportZip}>
            <Archive className="w-4 h-4 mr-1" />
            Export ZIP
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="launcher" className="flex flex-col h-full">
          <div className="px-6 pt-4 shrink-0">
            <TabsList>
              <TabsTrigger value="launcher">Launcher</TabsTrigger>
              <TabsTrigger value="game">Game</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="launcher" className="flex-1 overflow-hidden mt-0 px-0">
            <LogViewer
              entries={launcherLogs}
              onClear={clearLauncherLogs}
            />
          </TabsContent>

          <TabsContent value="game" className="flex-1 overflow-hidden mt-0">
            <div className="flex flex-col h-full">
              {instances.length > 0 && (
                <div className="px-6 py-2 border-b border-launcher-border shrink-0">
                  <Select
                    value={selectedInstance ?? ""}
                    onValueChange={setSelectedInstance}
                  >
                    <SelectTrigger className="w-64 h-8">
                      <SelectValue placeholder="Select instance" />
                    </SelectTrigger>
                    <SelectContent>
                      {instances.map((i) => (
                        <SelectItem key={i.id} value={i.id}>
                          {i.packName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {selectedInstance ? (
                <LogViewer
                  entries={gameLogs[selectedInstance] ?? []}
                  onClear={() => clearGameLogs(selectedInstance)}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm">
                    Select an instance to view game logs.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
