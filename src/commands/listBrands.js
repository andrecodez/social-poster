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
exports.listBrands = listBrands;
const brandManager_js_1 = __importDefault(require("../services/brandManager.js"));
const database_js_1 = __importDefault(require("../services/database.js"));
const columns = [
    { header: 'Name', width: 20, align: 'left' },
    { header: 'Industry', width: 25, align: 'left' },
    { header: 'Locations', width: 10, align: 'center' },
    { header: 'Topics', width: 8, align: 'center' },
    { header: 'Created', width: 12, align: 'left' },
];
function formatText(text, width, align) {
    if (text.length > width) {
        text = text.substring(0, width - 3) + '...';
    }
    const padding = width - text.length;
    switch (align) {
        case 'left':
            return text + ' '.repeat(padding);
        case 'right':
            return ' '.repeat(padding) + text;
        case 'center':
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;
            return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
        default:
            return text;
    }
}
function printTableHeader() {
    console.log('');
    console.log('📊 Brand Summary');
    console.log('═'.repeat(80));
    const headerRow = columns.map(col => formatText(col.header, col.width, 'center')).join('│');
    console.log(headerRow);
    console.log('─'.repeat(80));
}
function printBrandRow(brand, index) {
    const dateStr = brand.createdAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: '2-digit'
    });
    const row = [
        formatText(brand.name, columns[0].width, columns[0].align),
        formatText(brand.industry, columns[1].width, columns[1].align),
        formatText(brand.locationCount.toString(), columns[2].width, columns[2].align),
        formatText(brand.contentTopicCount.toString(), columns[3].width, columns[3].align),
        formatText(dateStr, columns[4].width, columns[4].align),
    ].join('│');
    console.log(row);
}
function listBrands() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🔍 Fetching brands from database...');
            const brands = yield brandManager_js_1.default.getAllBrandSummaries();
            if (brands.length === 0) {
                console.log('\n📭 No brands found in database');
                console.log('   💡 Run "npm run migrate-brands" to import brands from config files');
                return;
            }
            printTableHeader();
            brands.forEach((brand, index) => {
                printBrandRow(brand, index);
            });
            console.log('─'.repeat(80));
            console.log(`\n📈 Total brands: ${brands.length}`);
            // Show helpful commands
            console.log('\n💡 Next steps:');
            console.log('   • View brand details: npm run show-brand "Brand Name"');
            console.log('   • Migrate config data: npm run migrate-brands');
        }
        catch (error) {
            console.error('❌ Error listing brands:', error);
            process.exit(1);
        }
        finally {
            yield database_js_1.default.disconnect();
        }
    });
}
// Run if called directly
if (require.main === module) {
    listBrands()
        .then(() => {
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Unexpected error:', error);
        process.exit(1);
    });
}
