import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Trash2, Users, Mail, Phone, Loader2 } from 'lucide-react';
import { useProducerContacts, useCreateContact, useDeleteContact, CONTACT_ROLES } from '@/hooks/useProducers';

const contactSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  papel: z.string().min(1, 'Papel é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  whatsapp: z.string().optional(),
  notas: z.string().optional(),
});

export function ProducerContacts({ producerId }: { producerId: string }) {
  const { data: contacts, isLoading } = useProducerContacts(producerId);
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: { nome: '', papel: '', email: '', telefone: '', whatsapp: '', notas: '' },
  });

  const onSubmit = (values: any) => {
    createContact.mutate(
      { ...values, producer_id: producerId, email: values.email || null, telefone: values.telefone || null, whatsapp: values.whatsapp || null, notas: values.notas || null },
      { onSuccess: () => { setFormOpen(false); form.reset(); } }
    );
  };

  return (
    <>
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Contatos</CardTitle>
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : !contacts?.length ? (
            <div className="flex flex-col items-center py-8">
              <Users className="h-10 w-10 text-muted-foreground/20 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum contato cadastrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-sm">{c.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs capitalize">{c.papel}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.email ? <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{c.email}</span> : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.telefone ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.telefone}</span> : '—'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Contato</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="papel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Papel *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {CONTACT_ROLES.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="telefone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={createContact.isPending}>
                  {createContact.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Adicionar
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Contato</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteContact.mutate({ id: deleteId, producerId }, { onSettled: () => setDeleteId(null) }); }}
            >Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
