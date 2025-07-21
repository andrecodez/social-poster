"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const DatabaseModule = __importStar(require("./services/database.js"));
const DatabaseService = DatabaseModule.default;
const brandManager_js_1 = __importDefault(require("./services/brandManager.js"));
function testBrands() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('🧪 Testing brand system...\n');
            // Debug the database service
            console.log('🔍 Debugging database service...');
            console.log('   DatabaseModule:', Object.keys(DatabaseModule));
            console.log('   DatabaseService type:', typeof DatabaseService);
            console.log('   DatabaseService methods:', DatabaseService ? Object.getOwnPropertyNames(Object.getPrototypeOf(DatabaseService)) : 'undefined');
            if (!DatabaseService) {
                console.log('❌ DatabaseService is undefined');
                return;
            }
            // Test database connection
            console.log('\n1. Testing database connection...');
            const allBrands = yield DatabaseService.getAllBrands();
            console.log(`   ✅ Found ${allBrands.length} brands in database`);
            // Test brand manager
            console.log('\n2. Testing brand manager...');
            const summaries = yield brandManager_js_1.default.getAllBrandSummaries();
            console.log(`   ✅ Brand manager returned ${summaries.length} summaries`);
            // Test get brand details
            if (summaries.length > 0) {
                console.log('\n3. Testing brand details...');
                const firstBrand = summaries[0];
                const details = yield brandManager_js_1.default.getBrandDetails(firstBrand.id);
                console.log(`   ✅ Retrieved details for: ${details === null || details === void 0 ? void 0 : details.name}`);
                // Test brand context for AI
                console.log('\n4. Testing brand context...');
                const context = yield brandManager_js_1.default.getBrandContext(firstBrand.id);
                console.log(`   ✅ Retrieved context with ${context === null || context === void 0 ? void 0 : context.locations.length} locations`);
            }
            console.log('\n🎉 All tests passed!');
        }
        catch (error) {
            console.error('❌ Test failed:', error);
        }
        finally {
            if (DatabaseService && typeof DatabaseService.disconnect === 'function') {
                yield DatabaseService.disconnect();
            }
        }
    });
}
testBrands();
