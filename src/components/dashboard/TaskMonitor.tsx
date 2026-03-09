
import React from 'react';
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    CheckCircle,
    XCircle,
    Clock,
    Zap,
    TrendingUp,
    Calendar,
    MoreVertical,
    Play
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AgentTask {
    id: string;
    triggerType: string;
    tokenSymbol: string | null;
    conditionType: string | null;
    targetValue: number | null;
    executeAt: Date | null;
    cronSchedule: string | null;
    status: string;
    actionType: string;
    actionPayload: string;
    createdAt: Date;
    agent: { name: string };
}

export function TaskList({ tasks }: { tasks: AgentTask[] }) {
    return (
        <Card className="border-2 border-forest rounded-none neobrutal-shadow bg-white overflow-hidden">
            <CardHeader className="bg-celo border-b-2 border-forest p-4">
                <h3 className="font-black pt-1 uppercase italic flex items-center gap-2 text-forest">
                    <Zap className="w-5 h-5 fill-forest" />
                    Active Agent Tasks
                </h3>
            </CardHeader>
            <CardContent className="p-0">
                <div className="divide-y-2 divide-forest/10">
                    {tasks.length === 0 ? (
                        <div className="p-10 text-center">
                            <p className="text-forest-muted font-mono uppercase font-bold">No active tasks detected.</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div key={task.id} className="p-4 hover:bg-celo/5 transition-colors group">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Badge className="bg-forest text-celo rounded-none font-bold uppercase text-[10px]">
                                                {task.agent.name}
                                            </Badge>
                                            <Badge variant="outline" className="border-forest text-forest rounded-none font-bold uppercase text-[10px]">
                                                {task.triggerType}
                                            </Badge>
                                            {task.status === 'active' ? (
                                                <span className="flex items-center gap-1 text-[10px] text-forest font-bold uppercase animate-pulse">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-forest" />
                                                    Live
                                                </span>
                                            ) : (
                                                <span className="text-[10px] text-forest-muted font-bold uppercase">
                                                    {task.status}
                                                </span>
                                            )}
                                        </div>

                                        <h4 className="font-bold text-lg text-forest leading-tight mb-1">
                                            {task.triggerType === 'price' ? (
                                                <>Execute if <span className="text-forest underline decoration-celo decoration-4 italic">{task.tokenSymbol}</span> is {task.conditionType?.replace('_', ' ')} <span className="text-forest-muted">[{task.targetValue}]</span></>
                                            ) : task.triggerType === 'cron' ? (
                                                <>Recurring execute: <span className="italic font-mono text-forest-muted underline decoration-celo decoration-4">{task.cronSchedule}</span></>
                                            ) : (
                                                <>Scheduled for <span className="italic underline decoration-celo decoration-4">{task.executeAt ? formatDate(task.executeAt) : 'Unknown'}</span></>
                                            )}
                                        </h4>

                                        <div className="flex items-center gap-4 text-xs font-mono text-forest-muted">
                                            <div className="flex items-center gap-1">
                                                <Play className="w-3 h-3 fill-forest-muted" />
                                                {task.actionType}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(task.createdAt)}
                                            </div>
                                        </div>
                                    </div>

                                    <button className="p-2 border-2 border-forest neobrutal-shadow bg-gypsum hover:bg-celo transition-all rounded-none self-center">
                                        <MoreVertical className="w-5 h-5 text-forest" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function TaskStats({ tasks }: { tasks: AgentTask[] }) {
    const activeCount = tasks.filter(t => t.status === 'active').length;
    const priceCount = tasks.filter(t => t.triggerType === 'price').length;
    const timeCount = tasks.filter(t => t.triggerType !== 'price').length;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-forest p-4 border-2 border-forest neobrutal-shadow rounded-none text-gypsum">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-celo/70">Total Tasks</span>
                    <TrendingUp className="w-5 h-5 text-celo" />
                </div>
                <div className="text-4xl font-black mt-1 italic">{tasks.length}</div>
            </div>

            <div className="bg-celo p-4 border-2 border-forest neobrutal-shadow rounded-none text-forest">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-70">Price Watchers</span>
                    <Zap className="w-5 h-5" />
                </div>
                <div className="text-4xl font-black mt-1 italic">{priceCount}</div>
            </div>

            <div className="bg-gypsum p-4 border-2 border-forest neobrutal-shadow rounded-none text-forest">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest opacity-70">Schedules</span>
                    <Calendar className="w-5 h-5" />
                </div>
                <div className="text-4xl font-black mt-1 italic">{timeCount}</div>
            </div>
        </div>
    );
}
