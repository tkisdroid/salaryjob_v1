import { verifySession } from '@/lib/dal';
import { selectRole } from './actions';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function RoleSelectPage() {
  // First-layer check: must be authed to reach this page
  await verifySession();

  return (
    <Card className="p-6 shadow-sm max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-2">역할 선택</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">
        어떻게 GigNow을 사용하시나요?
      </p>
      <div className="space-y-3">
        <form action={selectRole}>
          <input type="hidden" name="role" value="WORKER" />
          <Button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white">
            🙋 일하고 싶어요 (Worker)
          </Button>
        </form>
        <form action={selectRole}>
          <input type="hidden" name="role" value="BUSINESS" />
          <Button type="submit" variant="outline" className="w-full">
            🏢 사람을 구해요 (Business)
          </Button>
        </form>
        <form action={selectRole}>
          <input type="hidden" name="role" value="BOTH" />
          <Button type="submit" variant="ghost" className="w-full">
            양쪽 다 사용해요 (Both)
          </Button>
        </form>
      </div>
    </Card>
  );
}
