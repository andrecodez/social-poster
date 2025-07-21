#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showBrand = showBrand;
const brandManager_js_1 = __importDefault(require("../services/brandManager.js"));
const database_js_1 = __importDefault(require("../services/database.js"));
function printSectionHeader(title) {
    console.log('\n' + '═'.repeat(60));
    console.log(`  ${title}`);
    console.log('═'.repeat(60));
}
function printSubsectionHeader(title) {
    console.log('\n' + '─'.repeat(40));
    console.log(`  ${title}`);
    console.log('─'.repeat(40));
}
function printLocations(locations) {
    printSubsectionHeader('📍 Locations');
    locations.forEach((location, index) => {
        console.log(`\n${index + 1}. ${location.name}`);
        console.log(`   📞 ${location.phone}`);
        console.log(`   📍 ${location.address}`);
        console.log(`   🏢 ${location.city}, ${location.state} ${location.zipCode}`);
        if (location.serviceArea && location.serviceArea.length > 0) {
            console.log(`   🗺️  Service Area: ${location.serviceArea.join(', ')}`);
        }
        if (location.specialties && location.specialties.length > 0) {
            console.log(`   ⭐ Specialties: ${location.specialties.join(', ')}`);
        }
    });
}
function printPostTemplate(template) {
    printSubsectionHeader('📝 Post Template');
    console.log(`Structure: ${template.structure}\n`);
    console.log('Tone Guidelines:');
    template.toneGuidelines.forEach(guideline => {
        console.log(`  • ${guideline}`);
    });
    if (template.callToActionExamples && template.callToActionExamples.length > 0) {
        console.log('\nCall-to-Action Examples:');
        template.callToActionExamples.forEach(cta => {
            console.log(`  • ${cta}`);
        });
    }
    if (template.hashtagGroups) {
        console.log('\nHashtag Groups:');
        Object.entries(template.hashtagGroups).forEach(([category, hashtags]) => {
            if (Array.isArray(hashtags) && hashtags.length > 0) {
                console.log(`  ${category}: ${hashtags.join(' ')}`);
            }
        });
    }
}
function printBrandVoice(brandVoice) {
    printSubsectionHeader('🎭 Brand Voice');
    console.log(`Tone: ${brandVoice.tone}\n`);
    if (brandVoice.personality && brandVoice.personality.length > 0) {
        console.log('Personality Traits:');
        brandVoice.personality.forEach(trait => {
            console.log(`  • ${trait}`);
        });
    }
    if (brandVoice.avoidWords && brandVoice.avoidWords.length > 0) {
        console.log('\nWords to Avoid:');
        brandVoice.avoidWords.forEach(word => {
            console.log(`  ❌ ${word}`);
        });
    }
}
function printContentTopics(topics) {
    printSubsectionHeader('💡 Content Topics');
    topics.forEach(topic => {
        console.log(`  • ${topic}`);
    });
}
function showBrand(brandNameOrId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get brand name/ID from command line arguments if not provided
            if (!brandNameOrId) {
                const args = process.argv.slice(2);
                brandNameOrId = args[0];
            }
            if (!brandNameOrId) {
                console.log('❌ Please provide a brand name or ID');
                console.log('   Usage: npm run show-brand "Brand Name"');
                console.log('   Usage: npm run show-brand brand-id');
                process.exit(1);
            }
            console.log(`🔍 Searching for brand: "${brandNameOrId}"`);
            // Try to find brand by ID first, then by name
            let brand = yield brandManager_js_1.default.getBrandDetails(brandNameOrId);
            if (!brand) {
                brand = yield brandManager_js_1.default.findBrandByName(brandNameOrId);
            }
            if (!brand) {
                console.log(`❌ Brand not found: "${brandNameOrId}"`);
                console.log('   💡 Run "npm run list-brands" to see available brands');
                process.exit(1);
            }
            // Get brand context for structured data
            const context = yield brandManager_js_1.default.getBrandContext(brand.id);
            if (!context) {
                console.log('❌ Unable to fetch brand context');
                process.exit(1);
            }
            // Get brand statistics
            const stats = yield database_js_1.default.getBrandStats(brand.id);
            // Print brand details
            printSectionHeader(`${brand.name} - Brand Details`);
            console.log(`🏢 Industry: ${brand.industry}`);
            console.log(`📝 Description: ${brand.description}`);
            console.log(`🎯 Target Audience: ${brand.targetAudience}`);
            console.log(`💎 Unique Value Prop: ${brand.uniqueValueProp}`);
            console.log(`🆔 Brand ID: ${brand.id}`);
            console.log(`📅 Created: ${brand.createdAt.toLocaleDateString()}`);
            console.log(`🔄 Updated: ${brand.updatedAt.toLocaleDateString()}`);
            // Print statistics
            printSubsectionHeader('📊 Statistics');
            console.log(`Posts: ${stats.totalPosts} total (${stats.postedCount} posted, ${stats.scheduledCount} scheduled, ${stats.failedCount} failed)`);
            // Print structured data sections
            printLocations(context.locations);
            printPostTemplate(context.postTemplate);
            printBrandVoice(context.brandVoice);
            printContentTopics(context.contentTopics);
            console.log('\n' + '═'.repeat(60));
            console.log('✅ Brand details displayed successfully');
        }
        catch (error) {
            console.error('❌ Error showing brand details:', error);
            process.exit(1);
        }
        finally {
            yield database_js_1.default.disconnect();
        }
    });
}
// Run if called directly
if (require.main === module) {
    showBrand()
        .then(() => {
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}
