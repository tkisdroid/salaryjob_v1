"use client";

import { Suspense, useState, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Lock,
  Mail,
  MapPin,
  Check,
  ArrowRight,
  ArrowLeft,
  PartyPopper,
} from "lucide-react";
import {
  signUpWithPassword,
  signInWithMagicLink,
  signInWithGoogle,
  signInWithKakao,
} from "./actions";
import { CeleryMark } from "@/components/brand/celery-mark";

type Role = "worker" | "business";

interface StepProps {
  onNext: () => void;
  onBack?: () => void;
}

function RoleSelect({ onRoleSelect }: { onRoleSelect: (role: Role) => void }) {
  return (
    <Card className="p-6 shadow-sm">
      <div className="text-center mb-6">
        <CeleryMark className="mx-auto mb-3 h-14 w-14 text-brand" />
        <h1 className="text-2xl font-bold">회원가입</h1>
        <p className="text-sm text-muted-foreground mt-1">
          샐러리잡을 어떻게 사용하실 건가요?
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onRoleSelect("worker")}
          className="w-full p-4 rounded-xl border-2 border-border hover:border-brand transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
              <span className="text-xl">🙋</span>
            </div>
            <div>
              <p className="font-semibold">일하고 싶어요</p>
              <p className="text-sm text-muted-foreground">
                빈 시간에 맞는 일자리를 찾고 싶어요
              </p>
            </div>
            <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground group-hover:text-brand transition-colors" />
          </div>
        </button>

        <button
          onClick={() => onRoleSelect("business")}
          className="w-full p-4 rounded-xl border-2 border-border hover:border-teal transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal/10 flex items-center justify-center group-hover:bg-teal/20 transition-colors">
              <span className="text-xl">🏢</span>
            </div>
            <div>
              <p className="font-semibold">사람을 구해요</p>
              <p className="text-sm text-muted-foreground">
                필요할 때 딱 맞는 인력을 구하고 싶어요
              </p>
            </div>
            <ArrowRight className="w-5 h-5 ml-auto text-muted-foreground group-hover:text-teal transition-colors" />
          </div>
        </button>
      </div>

      <Separator className="my-6" />
      <p className="text-center text-sm text-muted-foreground">
        이미 계정이 있으세요?{" "}
        <Link href="/login" className="text-brand font-medium hover:underline">
          로그인
        </Link>
      </p>
    </Card>
  );
}

function WorkerStep1() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, null);

  return (
    <Card className="p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">1</div>
          <div className="w-8 h-0.5 bg-border" />
          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">2</div>
          <div className="w-8 h-0.5 bg-border" />
          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">3</div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-1">기본 정보</h2>
      <p className="text-sm text-muted-foreground mb-6">2분이면 끝나요!</p>

      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" name="email" type="email" placeholder="email@example.com" className="pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">이름</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="name" name="name" placeholder="실명을 입력해주세요" className="pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">비밀번호</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" name="password" type="password" placeholder="8자 이상" className="pl-10" />
          </div>
        </div>

        {state?.error?.form && (
          <p className="text-sm text-destructive">{state.error.form[0]}</p>
        )}
        {state?.error?.email && (
          <p className="text-sm text-destructive">{state.error.email[0]}</p>
        )}
        {state?.error?.password && (
          <p className="text-sm text-destructive">{state.error.password[0]}</p>
        )}

        <Button type="submit" disabled={pending} className="w-full bg-brand hover:bg-brand-dark text-white">
          {pending ? '처리 중...' : <span className="flex items-center justify-center gap-1">다음 <ArrowRight className="w-4 h-4" /></span>}
        </Button>
      </form>

      <Separator className="my-4" />

      <div className="space-y-2">
        <form action={signInWithGoogle}>
          <Button type="submit" variant="outline" className="w-full">
            Google로 계속하기
          </Button>
        </form>
        <form action={signInWithKakao}>
          <Button
            type="submit"
            variant="outline"
            className="w-full bg-[#FEE500] hover:bg-[#FDD835] text-[#191919] border-[#FEE500]"
          >
            카카오로 시작하기
          </Button>
        </form>
        <form action={signInWithMagicLink}>
          <Input name="email" type="email" placeholder="이메일 주소" className="mb-2" />
          <Button type="submit" variant="ghost" className="w-full">
            Magic Link로 가입하기
          </Button>
        </form>
      </div>
    </Card>
  );
}

function WorkerStep2({ onNext, onBack }: StepProps) {
  return (
    <Card className="p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-brand/20 text-brand flex items-center justify-center text-sm font-bold"><Check className="w-4 h-4" /></div>
          <div className="w-8 h-0.5 bg-brand" />
          <div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold">2</div>
          <div className="w-8 h-0.5 bg-border" />
          <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-sm">3</div>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-1">활동 정보</h2>
      <p className="text-sm text-muted-foreground mb-6">건너뛰기 가능해요</p>

      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onNext(); }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="birth">생년월일</Label>
            <Input id="birth" type="date" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">성별</Label>
            <select id="gender" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
              <option value="">선택</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="region">활동 지역</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="region" placeholder="예: 강남구, 서초구" className="pl-10" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>관심 직종 (선택)</Label>
          <div className="flex flex-wrap gap-2">
            {["음식점·카페", "판매·유통", "물류·배송", "사무·행정", "행사·이벤트", "청소·정리", "교육·과외", "IT·디자인"].map((cat) => (
              <button key={cat} type="button" className="px-3 py-1.5 rounded-full text-sm border border-border hover:border-brand hover:bg-brand/5 transition-colors">
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onBack} className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-1" /> 이전
          </Button>
          <Button type="submit" className="flex-1 bg-brand hover:bg-brand-dark text-white">
            다음 <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </form>
    </Card>
  );
}

function WorkerStep3() {
  return (
    <Card className="p-6 shadow-sm text-center">
      <div className="w-16 h-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
        <PartyPopper className="w-8 h-8 text-brand" />
      </div>
      <h2 className="text-2xl font-bold mb-2">가입 완료!</h2>
      <p className="text-muted-foreground mb-8">
        샐러리잡에 오신 걸 환영해요. 이제 내 주변 일자리를 바로 확인해 볼까요?
      </p>

      <div className="space-y-3">
        <Button className="w-full bg-brand hover:bg-brand-dark text-white" asChild>
          <Link href="/">내 주변 일자리 보러가기</Link>
        </Button>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/my/availability">가용시간 등록하기</Link>
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" asChild>
          <Link href="/my/profile">프로필 더 채우기</Link>
        </Button>
      </div>
    </Card>
  );
}

function BusinessSignupForm() {
  const [state, formAction, pending] = useActionState(signUpWithPassword, null);

  return (
    <Card className="p-6 shadow-sm text-center">
      <CeleryMark className="mx-auto mb-3 h-14 w-14 text-brand" />
      <h2 className="text-xl font-bold mb-2">업체 회원가입</h2>
      <p className="text-sm text-muted-foreground mb-6">
        사업자 인증 후 구인 공고를 등록할 수 있어요
      </p>
      <form action={formAction} className="space-y-4 text-left">
        <div className="space-y-2">
          <Label htmlFor="biz-name">담당자 이름</Label>
          <Input id="biz-name" name="name" placeholder="이름" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biz-email">이메일</Label>
          <Input id="biz-email" name="email" type="email" placeholder="email@company.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biz-pw">비밀번호</Label>
          <Input id="biz-pw" name="password" type="password" placeholder="8자 이상" />
        </div>

        {state?.error?.form && (
          <p className="text-sm text-destructive">{state.error.form[0]}</p>
        )}

        <Button type="submit" disabled={pending} className="w-full bg-teal hover:bg-teal/90 text-white">
          {pending ? '처리 중...' : '가입하기'}
        </Button>
      </form>
    </Card>
  );
}

function SignupFlow() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const initialRole: Role | null =
    roleParam === "worker" || roleParam === "business" ? roleParam : null;

  const [role, setRole] = useState<Role | null>(initialRole);
  const [step, setStep] = useState(initialRole ? 1 : 0);

  if (!role) {
    return <RoleSelect onRoleSelect={(r) => { setRole(r); setStep(1); }} />;
  }

  if (role === "worker") {
    switch (step) {
      case 1:
        return <WorkerStep1 />;
      case 2:
        return <WorkerStep2 onNext={() => setStep(3)} onBack={() => setStep(1)} />;
      case 3:
        return <WorkerStep3 />;
    }
  }

  if (role === "business") {
    return <BusinessSignupForm />;
  }

  return null;
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupFlow />
    </Suspense>
  );
}
