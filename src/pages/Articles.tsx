import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArticlesTable } from '@/components/articles/ArticlesTable';
import { Package } from 'lucide-react';

const Articles = () => {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Catalogue</h1>
          <p className="text-muted-foreground">
            Gérez vos produits et services
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
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
