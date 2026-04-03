import { useCallback, useEffect, useState } from 'react';
import { Lightbulb, Send, ThumbsUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageTransition, MotionList, MotionItem, HoverCard } from '@/components/motion';
import { toast } from 'sonner';
import {
  createSalonFeedback,
  getSalonFeedbackList,
  getSalonFeedbackVoting,
  toggleSalonFeedbackVote,
} from '@/lib/api';

const categoryLabels: Record<string, string> = {
  BUG: 'Błąd',
  UX: 'UX / użyteczność',
  FEATURE: 'Nowa funkcja',
  INTEGRATION: 'Integracja',
  NOTIFICATIONS: 'Powiadomienia',
  OTHER: 'Inne',
};

const statusLabels: Record<string, string> = {
  NEW: 'Nowe',
  UNDER_REVIEW: 'W analizie',
  IN_VOTING: 'W głosowaniu',
  PLANNED: 'Zaplanowane',
  DONE: 'Zrobione',
  DECLINED: 'Odrzucone',
};

const priorityLabels: Record<string, string> = {
  LOW: 'Niski',
  MEDIUM: 'Średni',
  HIGH: 'Wysoki',
};

export default function SalonFeedbackPage() {
  const [tab, setTab] = useState('new');
  const [loading, setLoading] = useState(false);
  const [mine, setMine] = useState<any[]>([]);
  const [voting, setVoting] = useState<any[]>([]);
  const [form, setForm] = useState({
    category: 'FEATURE' as string,
    priority: 'MEDIUM' as string,
    title: '',
    body: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadMine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalonFeedbackList();
      setMine(res.feedback || []);
    } catch (e: any) {
      toast.error(e.message || 'Nie udało się wczytać zgłoszeń');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadVoting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalonFeedbackVoting();
      setVoting(res.items || []);
    } catch (e: any) {
      toast.error(e.message || 'Nie udało się wczytać listy głosowania');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'mine') loadMine();
    if (tab === 'vote') loadVoting();
  }, [tab, loadMine, loadVoting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.title.trim().length < 3) {
      toast.error('Tytuł powinien mieć co najmniej 3 znaki');
      return;
    }
    if (form.body.trim().length < 10) {
      toast.error('Opis powinien mieć co najmniej 10 znaków');
      return;
    }
    setSubmitting(true);
    try {
      await createSalonFeedback({
        category: form.category,
        title: form.title.trim(),
        body: form.body.trim(),
        priority: form.priority,
      });
      toast.success('Zgłoszenie wysłane — dziękujemy!');
      setForm({ ...form, title: '', body: '' });
      await loadMine();
      setTab('mine');
    } catch (err: any) {
      toast.error(err.message || 'Nie udało się wysłać');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (id: string) => {
    try {
      const res = await toggleSalonFeedbackVote(id);
      setVoting((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, voteCount: res.voteCount, hasMyVote: res.voted } : item,
        ),
      );
      toast.success(res.voted ? 'Oddano głos' : 'Cofnięto głos');
    } catch (err: any) {
      toast.error(err.message || 'Błąd głosowania');
    }
  };

  return (
    <PageTransition className="px-4 pt-4 pb-28 lg:pb-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Współtworzymy</h1>
          <p className="text-sm text-muted-foreground">
            Zgłaszaj pomysły i błędy — głosuj na to, co ma dla Ciebie znaczenie.
          </p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="rounded-xl flex flex-wrap h-auto gap-1 p-1 w-full justify-start">
          <TabsTrigger value="new" className="rounded-lg text-xs sm:text-sm">
            Nowe zgłoszenie
          </TabsTrigger>
          <TabsTrigger value="mine" className="rounded-lg text-xs sm:text-sm">
            Moje zgłoszenia
          </TabsTrigger>
          <TabsTrigger value="vote" className="rounded-lg text-xs sm:text-sm">
            Głosowanie
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-0">
          <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Kategoria</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priorytet</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tytuł</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Krótko: o co chodzi?"
                className="rounded-xl h-10"
                maxLength={200}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Opis</label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Szczegóły: kontekst, kroki, oczekiwane zachowanie…"
                className="rounded-xl min-h-[140px] resize-y"
                maxLength={20000}
              />
            </div>
            <Button type="submit" className="rounded-xl w-full sm:w-auto gap-2" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Wyślij zgłoszenie
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="mine" className="mt-0">
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : mine.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card rounded-2xl border border-border p-6 text-center">
              Nie masz jeszcze zgłoszeń.
            </p>
          ) : (
            <MotionList className="space-y-2">
              {mine.map((f) => (
                <MotionItem key={f.id}>
                  <HoverCard className="bg-card rounded-2xl p-4 border border-border space-y-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{f.title}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {categoryLabels[f.category] || f.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {priorityLabels[f.priority] || f.priority}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {statusLabels[f.status] || f.status}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(f.createdAt).toLocaleString('pl-PL')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{f.body}</p>
                    {f.authorEmail && (
                      <p className="text-[10px] text-muted-foreground">Autor: {f.authorEmail}</p>
                    )}
                    {f.publicReply && (
                      <div className="rounded-xl bg-muted/50 border border-border/60 px-3 py-2 text-xs">
                        <span className="font-medium text-foreground">Odpowiedź: </span>
                        {f.publicReply}
                      </div>
                    )}
                  </HoverCard>
                </MotionItem>
              ))}
            </MotionList>
          )}
        </TabsContent>

        <TabsContent value="vote" className="mt-0 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Lista pomysłów otwartych do głosowania — bez informacji o salonie zgłaszającym. Twój salon ma jeden głos na
            pomysł (kliknięcie dodaje lub cofa głos).
          </p>
          {loading ? (
            <div className="text-sm text-muted-foreground py-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : voting.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card rounded-2xl border border-border p-6 text-center">
              Brak aktywnego głosowania.
            </p>
          ) : (
            <MotionList className="space-y-2">
              {voting.map((item) => (
                <MotionItem key={item.id}>
                  <div className="bg-card rounded-2xl p-4 border border-border flex flex-col gap-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{item.title}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          {categoryLabels[item.category] || item.category}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground tabular-nums">{item.voteCount} głosów</span>
                        <Button
                          type="button"
                          size="sm"
                          variant={item.hasMyVote ? 'default' : 'outline'}
                          className="rounded-xl h-8 gap-1"
                          onClick={() => handleVote(item.id)}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          {item.hasMyVote ? 'Cofnij' : 'Głosuj'}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.body}</p>
                  </div>
                </MotionItem>
              ))}
            </MotionList>
          )}
        </TabsContent>
      </Tabs>
    </PageTransition>
  );
}
