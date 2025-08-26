
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create test user
  const hashedPassword = await bcrypt.hash('johndoe123', 12);
  
  const testUser = await prisma.user.upsert({
    where: { email: 'john@doe.com' },
    update: {},
    create: {
      email: 'john@doe.com',
      name: 'John Doe',
      password: hashedPassword,
    },
  });

  console.log('✅ Created test user:', testUser.email);

  // Create a sample conversation for the test user
  const sampleConversation = await prisma.conversation.create({
    data: {
      title: 'Welcome to Kronos AI',
      userId: testUser.id,
    },
  });

  // Add sample messages
  await prisma.message.createMany({
    data: [
      {
        conversationId: sampleConversation.id,
        role: 'assistant',
        content: 'Hello! Welcome to Kronos AI. I\'m here to help you with any questions or tasks you might have. How can I assist you today?',
        modelUsed: 'openai/gpt-3.5-turbo',
      },
      {
        conversationId: sampleConversation.id,
        role: 'user',
        content: 'Hello! Can you tell me about yourself?',
      },
      {
        conversationId: sampleConversation.id,
        role: 'assistant',
        content: 'I\'m Kronos AI, an advanced AI assistant powered by various language models through OpenRouter. I can help you with a wide range of tasks including:\n\n• Answering questions and providing information\n• Writing and editing content\n• Problem-solving and analysis\n• Creative tasks like brainstorming\n• Code assistance and technical support\n\nI have access to multiple AI models, so you can choose the one that best fits your needs. You can switch between models anytime during our conversation.\n\nWhat would you like to explore together?',
        modelUsed: 'openai/gpt-3.5-turbo',
      },
    ],
  });

  console.log('✅ Created sample conversation and messages');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
