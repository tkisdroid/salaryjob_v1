import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Smartphone } from "lucide-react";

export default function LoginPage() {
  return (
    <Card className="p-6 shadow-sm">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-bold text-lg">G</span>
        </div>
        <h1 className="text-2xl font-bold">로그인</h1>
        <p className="text-sm text-muted-foreground mt-1">
          GigNow에 오신 걸 환영해요
        </p>
      </div>

      <form className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="phone">휴대폰 번호</Label>
          <div className="relative">
            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="phone"
              type="tel"
              placeholder="010-0000-0000"
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <Input id="password" type="password" placeholder="비밀번호 입력" />
        </div>

        <Button type="submit" className="w-full bg-brand hover:bg-brand-dark text-white">
          로그인
        </Button>
      </form>

      <Separator className="my-6" />

      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          아직 계정이 없으세요?
        </p>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/signup">회원가입</Link>
        </Button>
      </div>
    </Card>
  );
}
