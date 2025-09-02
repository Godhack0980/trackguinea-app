
"use client"

import type { TransportRequest } from "@/ai/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2, Package, Rocket, Truck } from "lucide-react";

interface TrackingSidebarProps {
    isLoading: boolean;
    requests: TransportRequest[];
    selectedRequest: TransportRequest | null;
    onSelectRequest: (request: TransportRequest) => void;
}

const getRequestIcon = (nature: string) => {
    if (nature.toLowerCase().includes('meuble') || nature.toLowerCase().includes('déménagement')) return <Truck />;
    if (nature.toLowerCase().includes('urgent') || nature.toLowerCase().includes('document')) return <Rocket />;
    return <Package />;
};

export default function TrackingSidebar({ 
    isLoading,
    requests,
    selectedRequest,
    onSelectRequest 
}: TrackingSidebarProps) {
    return (
        <Card className="shadow-md rounded-2xl border-border">
            <CardHeader>
                <CardTitle className="text-lg text-accent">Courses en cours</CardTitle>
                <CardDescription>Sélectionnez une course pour voir sa position.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : requests.length > 0 ? (
                    requests.map((req, index) => (
                        <button 
                            key={req.id || `req-${index}`}
                            onClick={() => onSelectRequest(req)} 
                            className={`w-full text-left p-3 rounded-md border transition-colors ${
                                selectedRequest?.id === req.id ? 'bg-muted ring-2 ring-primary' : 'hover:bg-muted/50'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    {getRequestIcon(req.nature)}
                                </span>
                                <div>
                                    <p className="font-semibold">{req.nature}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {req.from} → {req.to}
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Aucune course en cours de suivi.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
