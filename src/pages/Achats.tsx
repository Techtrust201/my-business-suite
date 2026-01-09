import { AppLayout } from '@/components/layout/AppLayout';
import { BillsTable } from '@/components/bills/BillsTable';

const Achats = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Achats</h1>
          <p className="text-muted-foreground">
            Gérez vos factures fournisseurs
          </p>
        </div>

        <BillsTable />
      </div>
    </AppLayout>
  );
};

export default Achats;
