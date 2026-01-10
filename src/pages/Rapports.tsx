import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, FileText, PieChart, Receipt, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useBalanceSheet, useIncomeStatement, useVatReport } from '@/hooks/useAccountingReports';
import { BalanceSheetReport } from '@/components/reports/BalanceSheetReport';
import { IncomeStatementReport } from '@/components/reports/IncomeStatementReport';
import { VatReportView } from '@/components/reports/VatReportView';
import { FecExport } from '@/components/reports/FecExport';

const Rapports = () => {
  const [activeTab, setActiveTab] = useState('bilan');
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Rapports financiers</h1>
            <p className="text-muted-foreground">
              Bilan, compte de résultat et déclarations
            </p>
          </div>
        </div>

        {/* Period selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-end gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Date de début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Date de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setStartDate(`${currentYear}-01-01`);
                    setEndDate(`${currentYear}-12-31`);
                  }}
                >
                  Année {currentYear}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const q = Math.floor((new Date().getMonth()) / 3);
                    const qStart = new Date(currentYear, q * 3, 1);
                    const qEnd = new Date(currentYear, (q + 1) * 3, 0);
                    setStartDate(qStart.toISOString().split('T')[0]);
                    setEndDate(qEnd.toISOString().split('T')[0]);
                  }}
                >
                  Trimestre en cours
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    const mStart = new Date(currentYear, new Date().getMonth(), 1);
                    const mEnd = new Date(currentYear, new Date().getMonth() + 1, 0);
                    setStartDate(mStart.toISOString().split('T')[0]);
                    setEndDate(mEnd.toISOString().split('T')[0]);
                  }}
                >
                  Mois en cours
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="bilan" className="flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Bilan
            </TabsTrigger>
            <TabsTrigger value="resultat" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Compte de résultat
            </TabsTrigger>
            <TabsTrigger value="tva" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Déclaration TVA
            </TabsTrigger>
            <TabsTrigger value="fec" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export FEC
            </TabsTrigger>
          </TabsList>

          {/* Bilan Tab */}
          <TabsContent value="bilan" className="mt-6">
            <BalanceSheetReport date={endDate} />
          </TabsContent>

          {/* Compte de résultat Tab */}
          <TabsContent value="resultat" className="mt-6">
            <IncomeStatementReport startDate={startDate} endDate={endDate} />
          </TabsContent>

          {/* TVA Tab */}
          <TabsContent value="tva" className="mt-6">
            <VatReportView startDate={startDate} endDate={endDate} />
          </TabsContent>

          {/* FEC Export Tab */}
          <TabsContent value="fec" className="mt-6">
            <FecExport startDate={startDate} endDate={endDate} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Rapports;
