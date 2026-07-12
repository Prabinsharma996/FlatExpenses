const prisma = require("../lib/prisma");

async function isFlatMember(flatId, userId) {
  const member = await prisma.flatMember.findUnique({
    where: { flatId_userId: { flatId, userId } },
  });
  return !!member;
}

async function isFlatAdmin(flatId, userId) {
  const flat = await prisma.flat.findUnique({ where: { id: flatId } });
  return !!flat && flat.adminId === userId;
}

module.exports = { isFlatMember, isFlatAdmin };
