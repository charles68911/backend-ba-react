CREATE TABLE "admins" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" varchar(150) NOT NULL,
    "username" varchar(100) NOT NULL,
    "email" varchar(150) NOT NULL,
    "password_hash" varchar(255) NOT NULL,
    "role" varchar(50) DEFAULT 'Administrator' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "admins_username_unique" UNIQUE("username"),
    CONSTRAINT "admins_email_unique" UNIQUE("email")
);