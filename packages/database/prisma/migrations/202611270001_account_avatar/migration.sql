CREATE TABLE "AccountAvatar" (
    "userId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    CONSTRAINT "AccountAvatar_pkey" PRIMARY KEY ("userId"),
    CONSTRAINT "AccountAvatar_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
