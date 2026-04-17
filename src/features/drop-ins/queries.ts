import { prisma } from "@/lib/prisma";
import { withPrismaReadRetry } from "@/lib/prisma-read";
import {
  isPrismaSchemaMismatchError,
  logPrismaSchemaWarningOnce,
} from "@/lib/prisma-errors";
import type { Prisma } from "@prisma/client";

export type ListDropInPassesInput = {
  page: number;
  pageSize: number;
  status?: string;
  userId?: string;
};

export async function listDropInPasses({
  page,
  pageSize,
  status,
  userId,
}: ListDropInPassesInput) {
  const where: Prisma.DropInPassWhereInput = {
    status: status as never,
    userId,
  };

  try {
    const result = await withPrismaReadRetry(
      async () => {
        const [total, items] = await Promise.all([
          prisma.dropInPass.count({ where }),
          prisma.dropInPass.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
              session: {
                select: {
                  id: true,
                  title: true,
                  startsAt: true,
                },
              },
              paidBy: {
                select: {
                  fullName: true,
                },
              },
            },
          }),
        ]);

        return { total, items };
      },
      1,
      "drop-ins.listDropInPasses",
    );

    return {
      schemaReady: true as const,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
      items: result.items,
    };
  } catch (error) {
    if (
      !isPrismaSchemaMismatchError(error, {
        modelName: "DropInPass",
      })
    ) {
      throw error;
    }

    logPrismaSchemaWarningOnce(
      "drop-ins.listDropInPasses",
      "DropInPass.schema-mismatch",
      error,
    );

    return {
      schemaReady: false as const,
      total: 0,
      totalPages: 1,
      items: [],
    };
  }
}

export async function getDropInPassStats() {
  try {
    return await withPrismaReadRetry(
      async () => {
        const stats = await prisma.dropInPass.groupBy({
          by: ["status"],
          _count: true,
        });

        return stats.reduce(
          (acc, curr) => {
            acc[curr.status] = curr._count;
            return acc;
          },
          {} as Record<string, number>,
        );
      },
      1,
      "drop-ins.getDropInPassStats",
    );
  } catch (error) {
    if (
      !isPrismaSchemaMismatchError(error, {
        modelName: "DropInPass",
      })
    ) {
      throw error;
    }

    logPrismaSchemaWarningOnce(
      "drop-ins.getDropInPassStats",
      "DropInPass.schema-mismatch",
      error,
    );

    return {};
  }
}
