"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrateBrands = migrateBrands;
const client_1 = require("@prisma/client");
const brands_js_1 = require("../config/brands.js");
const prisma = new client_1.PrismaClient();
function migrateBrands() {
    return __awaiter(this, void 0, void 0, function* () {
        const result = {
            success: true,
            migrated: 0,
            errors: []
        };
        console.log('🚀 Starting brand migration from config files to database...\n');
        try {
            // Check if brands already exist
            const existingBrandsCount = yield prisma.brand.count();
            if (existingBrandsCount > 0) {
                console.log(`⚠️  Warning: Database already contains ${existingBrandsCount} brand(s)`);
                console.log('This migration will skip existing brands based on name');
            }
            const brandEntries = Object.entries(brands_js_1.brandConfigs);
            console.log(`📊 Found ${brandEntries.length} brands in config file`);
            for (const [configKey, brandConfig] of brandEntries) {
                try {
                    console.log(`\n📝 Processing brand: ${brandConfig.name} (${brandConfig.id})`);
                    // Check if brand already exists
                    const existingBrand = yield prisma.brand.findUnique({
                        where: { name: brandConfig.name }
                    });
                    if (existingBrand) {
                        console.log(`   ⏭️  Skipping ${brandConfig.name} - already exists in database`);
                        continue;
                    }
                    // Create brand record
                    const createdBrand = yield prisma.brand.create({
                        data: {
                            id: brandConfig.id,
                            name: brandConfig.name,
                            industry: brandConfig.industry,
                            description: brandConfig.description,
                            targetAudience: brandConfig.targetAudience,
                            uniqueValueProp: brandConfig.uniqueValueProp,
                            locations: brandConfig.locations,
                            postTemplate: brandConfig.postTemplate,
                            contentTopics: brandConfig.contentTopics,
                            brandVoice: brandConfig.brandVoice
                        }
                    });
                    console.log(`   ✅ Successfully migrated: ${createdBrand.name}`);
                    console.log(`      - ID: ${createdBrand.id}`);
                    console.log(`      - Industry: ${createdBrand.industry}`);
                    console.log(`      - Locations: ${brandConfig.locations.length}`);
                    console.log(`      - Content Topics: ${brandConfig.contentTopics.length}`);
                    result.migrated++;
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`   ❌ Failed to migrate ${brandConfig.name}: ${errorMessage}`);
                    result.errors.push({
                        brandId: brandConfig.id,
                        error: errorMessage
                    });
                    result.success = false;
                }
            }
            console.log('\n📈 Migration Summary:');
            console.log(`   ✅ Successfully migrated: ${result.migrated} brands`);
            console.log(`   ❌ Failed migrations: ${result.errors.length}`);
            if (result.errors.length > 0) {
                console.log('\n❌ Migration Errors:');
                result.errors.forEach(({ brandId, error }) => {
                    console.log(`   - ${brandId}: ${error}`);
                });
            }
            // Verify final state
            const finalBrandCount = yield prisma.brand.count();
            console.log(`\n🎯 Final database state: ${finalBrandCount} total brands`);
            if (result.migrated > 0) {
                console.log('\n🎉 Brand migration completed successfully!');
                console.log('   Next steps:');
                console.log('   1. Test brand queries with: npm run list-brands');
                console.log('   2. Update AI service to use database brands');
                console.log('   3. Remove old config files when ready');
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('💥 Fatal migration error:', errorMessage);
            result.success = false;
            result.errors.push({ brandId: 'GLOBAL', error: errorMessage });
        }
        finally {
            yield prisma.$disconnect();
        }
        return result;
    });
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
