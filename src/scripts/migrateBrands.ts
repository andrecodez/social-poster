import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationResult {
  success: boolean;
  migrated: number;
  errors: Array<{ brandId: string; error: string }>;
}

async function migrateBrands(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migrated: 0,
    errors: []
  };

  console.log('🚀 Checking brand migration status...\n');

  try {
    // Check if brands already exist
    const existingBrandsCount = await prisma.brand.count();
    if (existingBrandsCount > 0) {
      console.log(`✅ Migration already completed: Database contains ${existingBrandsCount} brand(s)`);
      console.log('📋 Current brands in database:');
      
      const brands = await prisma.brand.findMany({
        select: { id: true, name: true, industry: true, createdAt: true }
      });
      
      brands.forEach((brand, index) => {
        console.log(`   ${index + 1}. ${brand.name} (${brand.industry})`);
      });
      
      console.log('\n🎉 Brand migration system is ready to use!');
      console.log('💡 Available commands:');
      console.log('   • npm run list-brands - View all brands');
      console.log('   • npm run show-brand "Brand Name" - Show brand details');
      
      return result;
    }

    console.log('📭 No brands found in database');
    console.log('⚠️  Config files are no longer available for migration');
    console.log('📋 If you need to migrate brand data, please contact support');
    
    console.log('\n💡 To add brands manually, use the BrandManager service:');
    console.log('   import BrandManager from "./services/brandManager.js"');
    console.log('   await BrandManager.createBrand(brandData)');

    return result;



  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('💥 Fatal migration error:', errorMessage);
    result.success = false;
    result.errors.push({ brandId: 'GLOBAL', error: errorMessage });
  } finally {
    await prisma.$disconnect();
  }

  return result;
}

// Run migration if called directly
if (require.main === module) {
  migrateBrands()
    .then((result) => {
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Unexpected error:', error);
      process.exit(1);
    });
}

export { migrateBrands }; 