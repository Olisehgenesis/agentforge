
import React from "react";
import { prisma } from "@/lib/db";
import { TaskList, TaskStats } from "@/components/dashboard/TaskMonitor";
import { Terminal, Activity, RefreshCw } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function TasksPage() {
    const tasks = await prisma.agentTask.findMany({
        orderBy: { createdAt: "desc" },
        include: {
            agent: {
                select: {
                    name: true,
                    id: true,
                },
            },
        },
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-forest uppercase tracking-tighter flex items-center gap-3 italic">
                        <Activity className="w-10 h-10 text-celo" />
                        Agent Automation
                    </h1>
                    <p className="text-forest-muted mt-1 max-w-2xl font-mono text-sm font-bold uppercase">
                        Monitor heartbeat triggers, price watchers, and scheduled agent maneuvers.
                    </p>
                </div>
                <div>
                    <Link href="/dashboard/tasks">
                        <button className="flex items-center gap-2 px-6 py-3 bg-celo text-forest border-2 border-forest rounded-none font-black uppercase neobrutal-shadow hover:translate-x-[-4px] hover:translate-y-[-4px] active:translate-x-0 active:translate-y-0 transition-all italic tracking-tight">
                            <RefreshCw className="w-5 h-5" />
                            Force Refresh
                        </button>
                    </Link>
                </div>
            </div>

            <TaskStats tasks={tasks as any} />

            <div className="grid grid-cols-1 gap-6">
                <TaskList tasks={tasks as any} />
            </div>

            <div className="bg-forest p-6 border-2 border-forest neobrutal-shadow rounded-none">
                <div className="flex items-start gap-4">
                    <Terminal className="w-8 h-8 text-celo flex-shrink-0" />
                    <div className="text-gypsum">
                        <h4 className="font-black uppercase italic text-xl mb-1 tracking-tight">Heartbeat Engine Protocol</h4>
                        <p className="font-mono text-sm leading-relaxed opacity-80">
                            The system is being pulsed by an external heartbeat script. Every 1 second, the heartbeat hit the `/api/webhooks/price-update` endpoint, triggering logic for all active tasks shown above.
                        </p>
                        <div className="mt-4 flex gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-celo animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Webhook Engine Online</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-celo animate-pulse delay-150" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">Secret: Authenticated via ENV</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
