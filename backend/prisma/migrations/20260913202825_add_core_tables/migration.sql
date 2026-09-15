/*
  Warnings:

  - You are about to drop the `Test` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Test";

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "email" VARCHAR(200) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "tipo_usuario" VARCHAR(20) NOT NULL,
    "plan" VARCHAR(20) NOT NULL DEFAULT 'free',
    "creditos_disponibles" INTEGER NOT NULL DEFAULT 1,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cases" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "tipo_operacion" VARCHAR(50),
    "estado" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "consistencia" INTEGER,
    "criticals" INTEGER NOT NULL DEFAULT 0,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "oks" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "tipo" VARCHAR(30) NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "storage_path" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "extraction_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "extraction_confidence" INTEGER,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "extracted_data" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "field_name" VARCHAR(100) NOT NULL,
    "field_value" TEXT,
    "field_type" VARCHAR(20) NOT NULL,
    "confidence" INTEGER,
    "page_number" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extracted_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "regla_id" VARCHAR(10) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descripcion" TEXT NOT NULL,
    "doc_a_id" UUID,
    "doc_a_page" INTEGER,
    "doc_a_field" VARCHAR(100),
    "doc_a_value" TEXT,
    "doc_b_id" UUID,
    "doc_b_page" INTEGER,
    "doc_b_field" VARCHAR(100),
    "doc_b_value" TEXT,
    "razon" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "cases_user_id_idx" ON "cases"("user_id");

-- CreateIndex
CREATE INDEX "cases_created_at_idx" ON "cases"("created_at" DESC);

-- CreateIndex
CREATE INDEX "documents_case_id_idx" ON "documents"("case_id");

-- CreateIndex
CREATE INDEX "extracted_data_document_id_idx" ON "extracted_data"("document_id");

-- CreateIndex
CREATE INDEX "extracted_data_field_name_idx" ON "extracted_data"("field_name");

-- CreateIndex
CREATE INDEX "findings_case_id_idx" ON "findings"("case_id");

-- CreateIndex
CREATE INDEX "findings_severity_idx" ON "findings"("severity");

-- AddForeignKey
ALTER TABLE "cases" ADD CONSTRAINT "cases_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "extracted_data" ADD CONSTRAINT "extracted_data_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
