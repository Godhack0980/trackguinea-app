"use client";

import type { TransportRequest } from "@/ai/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Loader2, Package, Rocket, Truck, ArrowRight } from "lucide-react";
import { Badge } from "./ui/badge";
import { useTranslation } from "@/lib/translations";

interface TrackingSidebarProps {
    isLoading: boolean;
    requests: TransportRequest[];
    selectedRequest: TransportRequest | null;
    onSelectRequest: (request: TransportRequest) => void;
}

const getRequestIcon = (nature: string) => {
    if (nature.toLowerCase().includes('meuble') || nature.toLowerCase().includes('déménagement')) return <Truck className="h-4 w-4" />;
    if (nature.toLowerCase().includes('urgent') || nature.toLowerCase().includes('document')) return <Rocket className="h-4 w-4" />;
    return <Package className="h-4 w-4" />;
};

export default function TrackingSidebar({ 
    isLoading,
    requests,
    selectedRequest,
    onSelectRequest 
}: TrackingSidebarProps) {
    const { t } = useTranslation();

    return (
        <Card className="shadow-lg rounded-3xl border-border/50 overflow-hidden bg-card/60 backdrop-blur-md">
            <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-xl font-bold text-foreground">{t.tracking_active_parcels || "Colis actifs"}</CardTitle>
                <CardDescription>{t.tracking_active_subtitle || "Sélectionnez un colis pour afficher son trajet en temps réel."}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto p-4 md:p-6">
                {isLoading ? (
                    <div className="flex justify-center items-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : requests.length > 0 ? (
                    requests.map((req, index) => {
                        const isActive = selectedRequest?.id === req.id;
                        return (
                            <button 
                                key={req.id || `req-${index}`}
                                onClick={() => onSelectRequest(req)} 
                                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 flex flex-col gap-2 ${
                                    isActive 
                                      ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5 scale-[1.02]' 
                                      : 'border-border/60 hover:bg-muted/40 hover:scale-[1.01]'
                                }`}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-3">
                                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl transition-colors duration-300 ${
                                            isActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
                                        }`}>
                                            {getRequestIcon(req.nature)}
                                        </span>
                                        <div>
                                            <p className="font-bold text-foreground line-clamp-1">{req.nature}</p>
                                            <div className="flex items-center text-xs text-muted-foreground gap-1.5 mt-0.5">
                                                <span className="truncate max-w-[80px] font-medium">{req.from}</span>
                                                <ArrowRight size={10} className="shrink-0 text-muted-foreground/60" />
                                                <span className="truncate max-w-[80px] font-medium">{req.to}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={`rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold ${
                                        req.status === 'Livré' || req.status === 'Terminé'
                                            ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                                            : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 animate-pulse'
                                    }`}>
                                        {req.status === 'Livré' || req.status === 'Terminé' ? (t.tracking_step_delivered || 'Livré') : (t.tracking_step_in_transit || 'En transit')}
                                    </Badge>
                                </div>
                            </button>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground gap-2">
                        <Package className="h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium">{t.tracking_no_active || "Aucun colis en cours de livraison."}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
