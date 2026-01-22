import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Clock,
  Users,
  Pencil,
  ExternalLink,
  Calendar,
  Send,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { 
  useProspect, 
  useProspectContacts, 
  useProspectVisits, 
  type ProspectWithStatus 
} from '@/hooks/useProspects';
import { useProspectEmails } from '@/hooks/useProspectEmails';
import { useProspectQuotes } from '@/hooks/useProspectQuotes';
import { ProspectTimeline } from './ProspectTimeline';
import { ProspectContactsList } from './ProspectContactsList';
import { RecordVisitForm } from './RecordVisitForm';
import { ProspectEmailModal } from './ProspectEmailModal';
import { ConvertToClientModal } from './ConvertToClientModal';

interface ProspectDetailsProps {
  prospectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (prospect: ProspectWithStatus) => void;
}

export function ProspectDetails({ 
  prospectId, 
  open, 
  onOpenChange, 
  onEdit 
}: ProspectDetailsProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  const { data: prospect, isLoading: isLoadingProspect } = useProspect(prospectId || undefined);
  const { data: contacts, isLoading: isLoadingContacts } = useProspectContacts(prospectId || undefined);
  const { data: visits, isLoading: isLoadingVisits } = useProspectVisits(prospectId || undefined);
  const { data: emails, isLoading: isLoadingEmails } = useProspectEmails(prospectId || undefined);
  const { data: quotes, isLoading: isLoadingQuotes } = useProspectQuotes(prospect?.contact_id);

  const isLoading = isLoadingProspect || isLoadingContacts || isLoadingVisits || isLoadingEmails;

  const formatAddress = () => {
    if (!prospect) return null;
    const parts = [
      prospect.address_line1,
      prospect.address_line2,
      [prospect.postal_code, prospect.city].filter(Boolean).join(' '),
      prospect.country !== 'FR' ? prospect.country : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  const getSourceLabel = (source: string | null) => {
    switch (source) {
      case 'terrain': return 'Terrain';
      case 'web': return 'Web';
      case 'referral': return 'Recommandation';
      case 'salon': return 'Salon';
      case 'phoning': return 'Phoning';
      default: return source || 'Inconnu';
    }
  };

  const isConverted = !!prospect?.converted_at || !!prospect?.contact_id;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {isLoadingProspect ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : prospect ? (
            <div className="space-y-6">
              {/* Header */}
              <SheetHeader className="text-left">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-xl truncate">
                      {prospect.company_name}
                    </SheetTitle>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {prospect.status && (
                        <Badge
                          style={{ 
                            backgroundColor: prospect.status.color,
                            color: 'white'
                          }}
                        >
                          {prospect.status.name}
                        </Badge>
                      )}
                      <Badge variant="outline">
                        {getSourceLabel(prospect.source)}
                      </Badge>
                      {isConverted && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Client
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onEdit(prospect)}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowVisitForm(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Enregistrer visite
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowEmailModal(true)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Email
                </Button>
                {!isConverted && (
                  <Button 
                    variant="default" 
                    size="sm"
                    onClick={() => setShowConvertModal(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Convertir
                  </Button>
                )}
              </div>

              <Separator />

              {/* Company Info */}
              <div className="space-y-3">
                <h3 className="font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Informations
                </h3>
                
                <div className="grid gap-2 text-sm">
                  {formatAddress() && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span>{formatAddress()}</span>
                      {prospect.latitude && prospect.longitude && (
                        <a 
                          href={`https://www.google.com/maps?q=${prospect.latitude},${prospect.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                  
                  {prospect.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${prospect.phone}`} className="text-primary hover:underline">
                        {prospect.phone}
                      </a>
                    </div>
                  )}
                  
                  {prospect.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${prospect.email}`} className="text-primary hover:underline">
                        {prospect.email}
                      </a>
                    </div>
                  )}
                  
                  {prospect.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {prospect.website}
                      </a>
                    </div>
                  )}
                  
                  {(prospect.siret || prospect.siren || prospect.vat_number) && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {prospect.siret && `SIRET: ${prospect.siret}`}
                        {prospect.siret && prospect.siren && ' • '}
                        {prospect.siren && `SIREN: ${prospect.siren}`}
                        {(prospect.siret || prospect.siren) && prospect.vat_number && ' • '}
                        {prospect.vat_number && `TVA: ${prospect.vat_number}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Créé le {format(new Date(prospect.created_at), 'd MMM yyyy', { locale: fr })}
                  </span>
                  {prospect.geocoded_at && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Géolocalisé
                    </span>
                  )}
                </div>
              </div>

              <Separator />

              {/* Tabs for Timeline, Contacts, Notes */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="timeline" className="text-xs">
                    <Clock className="h-4 w-4 mr-1" />
                    Activité
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="text-xs">
                    <Users className="h-4 w-4 mr-1" />
                    Contacts ({contacts?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">
                    <FileText className="h-4 w-4 mr-1" />
                    Notes
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="timeline" className="mt-4">
                  <ProspectTimeline
                    visits={visits || []}
                    emails={emails || []}
                    quotes={quotes || []}
                    isLoading={isLoadingVisits || isLoadingEmails || isLoadingQuotes}
                  />
                </TabsContent>
                
                <TabsContent value="contacts" className="mt-4">
                  <ProspectContactsList
                    prospectId={prospect.id}
                    contacts={contacts || []}
                    isLoading={isLoadingContacts}
                  />
                </TabsContent>
                
                <TabsContent value="notes" className="mt-4">
                  {prospect.notes ? (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{prospect.notes}</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucune note pour ce prospect</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Prospect non trouvé</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Visit Form Modal */}
      {prospect && (
        <RecordVisitForm
          open={showVisitForm}
          onOpenChange={setShowVisitForm}
          prospect={prospect}
        />
      )}

      {/* Email Modal */}
      {prospect && (
        <ProspectEmailModal
          open={showEmailModal}
          onOpenChange={setShowEmailModal}
          prospect={prospect}
          contacts={contacts || []}
        />
      )}

      {/* Convert to Client Modal */}
      {prospect && (
        <ConvertToClientModal
          open={showConvertModal}
          onOpenChange={setShowConvertModal}
          prospect={prospect}
          contacts={contacts || []}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
