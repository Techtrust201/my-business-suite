import { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChartAccount, groupAccountsByClass } from '@/hooks/useChartOfAccounts';
import { Badge } from '@/components/ui/badge';

interface ChartOfAccountsTreeProps {
  accounts: ChartAccount[];
}

export function ChartOfAccountsTree({ accounts }: ChartOfAccountsTreeProps) {
  const [expandedClasses, setExpandedClasses] = useState<Set<number>>(new Set([4, 5, 6, 7]));
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const groupedAccounts = groupAccountsByClass(accounts);

  const toggleClass = (classNum: number) => {
    setExpandedClasses(prev => {
      const next = new Set(prev);
      if (next.has(classNum)) {
        next.delete(classNum);
      } else {
        next.add(classNum);
      }
      return next;
    });
  };

  const getAccountTypeLabel = (type: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      asset: { label: 'Actif', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      liability: { label: 'Passif', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
      equity: { label: 'Capitaux', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
      income: { label: 'Produit', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      expense: { label: 'Charge', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
    };
    return labels[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
  };

  const getClassColor = (classNum: number) => {
    const colors: Record<number, string> = {
      1: 'text-purple-600 dark:text-purple-400',
      2: 'text-blue-600 dark:text-blue-400',
      3: 'text-cyan-600 dark:text-cyan-400',
      4: 'text-orange-600 dark:text-orange-400',
      5: 'text-green-600 dark:text-green-400',
      6: 'text-red-600 dark:text-red-400',
      7: 'text-emerald-600 dark:text-emerald-400',
      8: 'text-gray-600 dark:text-gray-400',
    };
    return colors[classNum] || 'text-gray-600';
  };

  // Build hierarchy within each class
  const buildHierarchy = (classAccounts: ChartAccount[]) => {
    const roots: ChartAccount[] = [];
    const children: Map<string, ChartAccount[]> = new Map();

    // Sort by account number length then by number
    const sorted = [...classAccounts].sort((a, b) => {
      if (a.account_number.length !== b.account_number.length) {
        return a.account_number.length - b.account_number.length;
      }
      return a.account_number.localeCompare(b.account_number);
    });

    sorted.forEach(account => {
      if (!account.parent_account_number) {
        roots.push(account);
      } else {
        const parentChildren = children.get(account.parent_account_number) || [];
        parentChildren.push(account);
        children.set(account.parent_account_number, parentChildren);
      }
    });

    return { roots, children };
  };

  const renderAccount = (account: ChartAccount, children: Map<string, ChartAccount[]>, level: number = 0) => {
    const accountChildren = children.get(account.account_number) || [];
    const hasChildren = accountChildren.length > 0;
    const isExpanded = expandedAccounts.has(account.account_number);
    const typeInfo = getAccountTypeLabel(account.account_type);

    return (
      <div key={account.id}>
        <div 
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors",
            level > 0 && "ml-6"
          )}
          onClick={() => {
            if (hasChildren) {
              setExpandedAccounts(prev => {
                const next = new Set(prev);
                if (next.has(account.account_number)) {
                  next.delete(account.account_number);
                } else {
                  next.add(account.account_number);
                }
                return next;
              });
            }
          }}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            )
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-mono text-sm text-muted-foreground w-16 shrink-0">
            {account.account_number}
          </span>
          <span className="flex-1 text-sm truncate">
            {account.name}
          </span>
          <Badge variant="outline" className={cn("text-xs", typeInfo.color)}>
            {typeInfo.label}
          </Badge>
          {account.is_system && (
            <Badge variant="secondary" className="text-xs">
              Système
            </Badge>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {accountChildren.map(child => renderAccount(child, children, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      {groupedAccounts.map(group => {
        const isExpanded = expandedClasses.has(group.class);
        const { roots, children } = buildHierarchy(group.accounts);

        return (
          <div key={group.class} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleClass(group.class)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
              <Folder className={cn("h-5 w-5", getClassColor(group.class))} />
              <span className="font-semibold">
                Classe {group.class} - {group.name}
              </span>
              <Badge variant="secondary" className="ml-auto">
                {group.accounts.length} comptes
              </Badge>
            </button>
            {isExpanded && (
              <div className="p-2 space-y-0.5">
                {roots.map(account => renderAccount(account, children))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
