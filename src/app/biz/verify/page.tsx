"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  Upload,
  FileCheck,
  CheckCircle,
  Loader2,
  Building2,
  User,
  Calendar,
  Hash,
  ArrowRight,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/* ── Mock OCR Result ── */

const MOCK_OCR_RESULT = {
  businessNumber: "123-45-67890",
  representativeName: "홍길동",
  businessName: "맛있는 카페",
  startDate: "2020-03-15",
  businessType: "음식점업",
  address: "서울특별시 강남구 테헤란로 123",
} as const

/* ── Step Indicator ── */

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: "서류 업로드" },
    { number: 2, label: "정보 확인" },
    { number: 3, label: "인증 완료" },
  ] as const

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => (
        <div key={step.number} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                currentStep >= step.number
                  ? "bg-teal text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {currentStep > step.number ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline ${
                currentStep >= step.number
                  ? "text-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 sm:w-12 h-0.5 ${
                currentStep > step.number ? "bg-teal" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Step 1: Upload ── */

function StepUpload({ onNext }: { onNext: () => void }) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    setFileName("사업자등록증.pdf")
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setFileName(file.name)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-teal" />
          사업자등록증 업로드
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? "border-teal bg-teal/5"
              : fileName
                ? "border-teal/40 bg-teal/5"
                : "border-border hover:border-teal/40 hover:bg-muted/30"
          }`}
        >
          {fileName ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal/10">
                <FileCheck className="w-7 h-7 text-teal" />
              </div>
              <p className="text-sm font-medium text-foreground">{fileName}</p>
              <p className="text-xs text-muted-foreground">
                파일이 선택되었습니다
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-muted">
                <ImageIcon className="w-7 h-7 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  파일을 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, JPG, PNG (최대 10MB)
                </p>
              </div>
            </div>
          )}
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={onNext}
            disabled={!fileName}
            className="bg-teal text-white hover:bg-teal/90"
          >
            다음
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Step 2: OCR Review ── */

function StepOcrReview({
  onNext,
  onBack,
}: {
  onNext: () => void
  onBack: () => void
}) {
  const [formData, setFormData] = useState({
    businessNumber: MOCK_OCR_RESULT.businessNumber,
    representativeName: MOCK_OCR_RESULT.representativeName,
    businessName: MOCK_OCR_RESULT.businessName,
    startDate: MOCK_OCR_RESULT.startDate,
    businessType: MOCK_OCR_RESULT.businessType,
    address: MOCK_OCR_RESULT.address,
  })

  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const fields = [
    {
      key: "businessNumber",
      label: "사업자등록번호",
      icon: Hash,
    },
    {
      key: "representativeName",
      label: "대표자명",
      icon: User,
    },
    {
      key: "businessName",
      label: "상호명",
      icon: Building2,
    },
    {
      key: "startDate",
      label: "개업일자",
      icon: Calendar,
    },
    {
      key: "businessType",
      label: "업종",
      icon: Building2,
    },
    {
      key: "address",
      label: "사업장 소재지",
      icon: Building2,
    },
  ] as const

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-teal" />
          OCR 인식 결과 확인
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          자동 인식된 정보를 확인하고 수정해주세요.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {fields.map((field) => {
            const Icon = field.icon
            return (
              <div key={field.key} className="space-y-1.5">
                <Label
                  htmlFor={field.key}
                  className="flex items-center gap-1.5"
                >
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  {field.label}
                </Label>
                <Input
                  id={field.key}
                  value={formData[field.key as keyof typeof formData]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                />
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
            이전
          </Button>
          <Button
            onClick={onNext}
            className="bg-teal text-white hover:bg-teal/90"
          >
            인증 요청
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/* ── Step 3: Verification Status ── */

function StepVerificationStatus({ onBack }: { onBack: () => void }) {
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setVerified(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {verified ? (
            <CheckCircle className="w-5 h-5 text-teal" />
          ) : (
            <Loader2 className="w-5 h-5 text-teal animate-spin" />
          )}
          사업자 인증
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center py-12">
          {verified ? (
            <>
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-teal/10 mb-6">
                <CheckCircle className="w-10 h-10 text-teal" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                인증이 완료되었습니다
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                사업자 인증이 성공적으로 완료되었습니다. 이제 공고를 등록하고
                인재를 채용할 수 있어요.
              </p>
              <Button
                className="mt-8 bg-teal text-white hover:bg-teal/90"
                asChild
              >
                <Link href="/biz/posts/new">
                  첫 공고 등록하기
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center w-20 h-20 rounded-full bg-teal/10 mb-6">
                <Loader2 className="w-10 h-10 text-teal animate-spin" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                국세청 확인 중...
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                사업자등록 정보를 국세청에 조회하고 있습니다. 잠시만
                기다려주세요.
              </p>
            </>
          )}
        </div>

        {!verified && (
          <div className="flex justify-start">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4" />
              이전
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Page ── */

export default function BizVerifyPage() {
  const [step, setStep] = useState(1)

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">사업자 인증</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          사업자등록증을 업로드하여 인증을 완료하세요.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      <div className="max-w-2xl mx-auto">
        {step === 1 && <StepUpload onNext={() => setStep(2)} />}
        {step === 2 && (
          <StepOcrReview
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && <StepVerificationStatus onBack={() => setStep(2)} />}
      </div>
    </div>
  )
}
