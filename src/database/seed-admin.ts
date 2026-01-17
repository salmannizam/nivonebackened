import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SuperAdminService } from '../super-admin/super-admin.service';
import { ConfigService } from '@nestjs/config';

/**
 * Seed script to create Super Admin
 * 
 * This script creates:
 * - Super Admin user for platform management
 * 
 * Super Admin can:
 * - Create and manage tenants
 * - Enable/disable features per tenant
 * - Manage all platform settings
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const configService = app.get(ConfigService);
  const superAdminService = app.get(SuperAdminService);

  console.log('🌱 Starting admin seed process...\n');

  // Get super admin credentials from env or use defaults
  const adminEmail = configService.get('SUPER_ADMIN_EMAIL', 'admin@platform.com');
  const adminPassword = configService.get('SUPER_ADMIN_PASSWORD', 'admin123');
  const adminName = configService.get('SUPER_ADMIN_NAME', 'Platform Administrator');

  try {
    // Check if super admin already exists
    const existing = await superAdminService.findByEmail(adminEmail);
    if (existing) {
      console.log('✅ Super Admin already exists:');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Name: ${existing.name}`);
      console.log('\n⚠️  Skipping creation. To reset, delete the existing super admin first.');
      await app.close();
      process.exit(0);
    }
  } catch (error) {
    // Super admin doesn't exist, proceed with creation
  }

  try {
    // Create super admin (password will be hashed by service)
    const superAdmin = await superAdminService.create({
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    });

    console.log('✅ Super Admin created successfully!');
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Name: ${superAdmin.name}`);
    const superAdminDoc = superAdmin as any;
    if (superAdminDoc._id) {
      console.log(`   ID: ${superAdminDoc._id}`);
    }
    console.log('\n📝 Next steps:');
    console.log('   1. Log in with the super admin credentials');
    console.log('   2. Create tenants from the admin panel');
    console.log('   3. Each tenant will get an owner user');
    console.log('\n⚠️  IMPORTANT: Change the default password in production!');
  } catch (error: any) {
    console.error('❌ Error creating super admin:', error.message);
    if (error.code === 11000) {
      console.error('   Super admin with this email already exists.');
    }
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();
