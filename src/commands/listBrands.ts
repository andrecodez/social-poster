#!/usr/bin/env node

import BrandManager from '../services/brandManager.js';
import DatabaseService from '../services/database.js';

interface TableColumn {
  header: string;
  width: number;
  align: 'left' | 'right' | 'center';
}

const columns: TableColumn[] = [
  { header: 'Name', width: 20, align: 'left' },
  { header: 'Industry', width: 25, align: 'left' },
  { header: 'Locations', width: 10, align: 'center' },
  { header: 'Topics', width: 8, align: 'center' },
  { header: 'Created', width: 12, align: 'left' },
];

function formatText(text: string, width: number, align: 'left' | 'right' | 'center'): string {
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

function printTableHeader(): void {
  console.log('');
  console.log('📊 Brand Summary');
  console.log('═'.repeat(80));
  
  const headerRow = columns.map(col => formatText(col.header, col.width, 'center')).join('│');
  console.log(headerRow);
  console.log('─'.repeat(80));
}

function printBrandRow(brand: any, index: number): void {
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

async function listBrands(): Promise<void> {
  try {
    console.log('🔍 Fetching brands from database...');
    
    const brands = await BrandManager.getAllBrandSummaries();
    
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
    
  } catch (error) {
    console.error('❌ Error listing brands:', error);
    process.exit(1);
  } finally {
    await DatabaseService.disconnect();
  }
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

export { listBrands }; 