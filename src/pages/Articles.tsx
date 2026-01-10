import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArticlesTable } from '@/components/articles/ArticlesTable';
import { Package } from 'lucide-react';

const Articles = () => {
  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Catalogue</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez vos produits et services
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-5 w-5" />
              Articles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ArticlesTable />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Articles;
