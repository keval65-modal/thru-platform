'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { OnboardingSummary } from '@/lib/onboarding-service';
import { ArrowRight, CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProfileCompletionCard({ summary }: { summary: OnboardingSummary }) {
  return (
    <Card className="border">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Profile completion</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">
              Complete onboarding to unlock payouts and smoother operations.
            </div>
          </div>
          <Badge variant={summary.completionPercent >= 80 ? 'default' : 'secondary'}>
            {summary.completionPercent}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={summary.completionPercent} className="h-2" />

        <div className="space-y-2">
          {summary.checklist.map((item) => {
            const Icon = item.completed ? CheckCircle2 : Circle;
            const severityClass =
              item.severity === 'red'
                ? 'text-red-600'
                : item.severity === 'amber'
                  ? 'text-amber-600'
                  : 'text-muted-foreground';

            return (
              <Link
                key={item.key}
                href={item.href}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md border p-3 hover:bg-muted/40 transition-colors',
                  item.completed ? 'border-muted' : item.severity === 'red' ? 'border-red-200 bg-red-50/40' : 'border-amber-200 bg-amber-50/30'
                )}
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn('h-5 w-5 mt-0.5', item.completed ? 'text-green-600' : severityClass)} />
                  <div>
                    <div className="text-sm font-medium">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!item.completed && item.severity !== 'none' && (
                    <AlertTriangle className={cn('h-4 w-4', severityClass)} />
                  )}
                  <span className="text-xs text-muted-foreground">{item.weightPercent}%</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

