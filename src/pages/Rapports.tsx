import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PieChart, Receipt, Download, TrendingUp } from 'lucide-react';
import { BalanceSheetReport } from '@/components/reports/BalanceSheetReport';
import { IncomeStatementReport } from '@/components/reports/IncomeStatementReport';
import { VatReportView } from '@/components/reports/VatReportView';
import { FecExport } from '@/components/reports/FecExport';

const Rapports = () => {
  const [activeTab, setActiveTab] = useState('bilan');
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Rapports financiers</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Bilan, compte de résultat et déclarations
          </p>
        </div>

        {/* Period selector */}
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
              <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-xs sm:text-sm">Début</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full sm:w-36"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-xs sm:text-sm">Fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full sm:w-36"
                  />
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => {
                    setStartDate(`${currentYear}-01-01`);
                    setEndDate(`${currentYear}-12-31`);
                  }}
                >
                  {currentYear}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => {
                    const q = Math.floor((new Date().getMonth()) / 3);
                    const qStart = new Date(currentYear, q * 3, 1);
                    const qEnd = new Date(currentYear, (q + 1) * 3, 0);
                    setStartDate(qStart.toISOString().split('T')[0]);
                    setEndDate(qEnd.toISOString().split('T')[0]);
                  }}
                >
                  Trimestre
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => {
                    const mStart = new Date(currentYear, new Date().getMonth(), 1);
                    const mEnd = new Date(currentYear, new Date().getMonth() + 1, 0);
                    setStartDate(mStart.toISOString().split('T')[0]);
                    setEndDate(mEnd.toISOString().split('T')[0]);
                  }}
                >
                  Mois
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex overflow-x-auto">
            <TabsTrigger value="bilan" className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <PieChart className="h-4 w-4 shrink-0" />
              <span className="truncate">Bilan</span>
            </TabsTrigger>
            <TabsTrigger value="resultat" className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="truncate">Résultat</span>
            </TabsTrigger>
            <TabsTrigger value="tva" className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="truncate">TVA</span>
            </TabsTrigger>
            <TabsTrigger value="fec" className="flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">FEC</span>
            </TabsTrigger>
          </TabsList>

          {/* Bilan Tab */}
          <TabsContent value="bilan" className="mt-4 sm:mt-6">
            <BalanceSheetReport date={endDate} />
          </TabsContent>

          {/* Compte de résultat Tab */}
          <TabsContent value="resultat" className="mt-4 sm:mt-6">
            <IncomeStatementReport startDate={startDate} endDate={endDate} />
          </TabsContent>

          {/* TVA Tab */}
          <TabsContent value="tva" className="mt-4 sm:mt-6">
            <VatReportView startDate={startDate} endDate={endDate} />
          </TabsContent>

          {/* FEC Export Tab */}
          <TabsContent value="fec" className="mt-4 sm:mt-6">
            <FecExport startDate={startDate} endDate={endDate} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Rapports;
