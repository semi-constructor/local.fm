import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    premium?: boolean;
}

export function Card({ className, premium, ...props }: CardProps) {
    return (
        <div
            className={cn(
                "bg-card border border-border/50 rounded-2xl transition-all duration-300",
                premium && "shadow-sm hover:shadow-md hover:border-border",
                className
            )}
            {...props}
        />
    );
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        label: string;
    };
    colorClass?: string;
    className?: string;
}

export function StatCard({ title, value, icon, trend, colorClass, className }: StatCardProps) {
    return (
        <Card premium className={cn("p-6 flex flex-col justify-between", className)}>
            <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl", colorClass || "bg-secondary")}>
                    {icon}
                </div>
                {trend && (
                    <div className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full",
                        trend.value >= 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}>
                        {trend.value >= 0 ? "+" : ""}{trend.value}%
                    </div>
                )}
            </div>
            <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{title}</h3>
                <p className="text-3xl font-black tracking-tighter tabular-nums truncate">{value}</p>
            </div>
        </Card>
    );
}
