import { AppLayout } from '@/components/layout/AppLayout';
import { QuotesTable } from '@/components/quotes/QuotesTable';

const Devis = () => {
  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Devis</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez vos propositions commerciales
          </p>
        </div>

        <QuotesTable />
      </div>
    </AppLayout>
  );
};

export default Devis;
