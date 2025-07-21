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
exports.BrandManager = void 0;
const database_js_1 = __importDefault(require("./database.js"));
class BrandManager {
    /**
     * Get all brands with summary information
     */
    getAllBrandSummaries() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const brands = yield database_js_1.default.getAllBrands();
                return brands.map(brand => ({
                    id: brand.id,
                    name: brand.name,
                    industry: brand.industry,
                    locationCount: Array.isArray(brand.locations) ? brand.locations.length : 0,
                    contentTopicCount: Array.isArray(brand.contentTopics) ? brand.contentTopics.length : 0,
                    createdAt: brand.createdAt,
                }));
            }
            catch (error) {
                console.error('❌ Error fetching brand summaries:', error);
                throw new Error('Failed to fetch brand summaries');
            }
        });
    }
    /**
     * Get detailed brand information
     */
    getBrandDetails(brandId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield database_js_1.default.getBrand(brandId);
            }
            catch (error) {
                console.error(`❌ Error fetching brand details for ${brandId}:`, error);
                throw new Error(`Failed to fetch brand details for ${brandId}`);
            }
        });
    }
    /**
     * Get brand by name (case-insensitive search)
     */
    findBrandByName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // First try exact match
                let brand = yield database_js_1.default.getBrandByName(name);
                // If no exact match, try case-insensitive search
                if (!brand) {
                    const allBrands = yield database_js_1.default.getAllBrands();
                    brand = allBrands.find(b => b.name.toLowerCase() === name.toLowerCase()) || null;
                }
                return brand;
            }
            catch (error) {
                console.error(`❌ Error finding brand by name ${name}:`, error);
                throw new Error(`Failed to find brand by name: ${name}`);
            }
        });
    }
    /**
     * Validate brand data before creation/update
     */
    validateBrandData(brandData) {
        var _a, _b, _c, _d, _e, _f, _g;
        const errors = [];
        // Required fields validation
        if (!((_a = brandData.name) === null || _a === void 0 ? void 0 : _a.trim())) {
            errors.push('Brand name is required');
        }
        if (!((_b = brandData.industry) === null || _b === void 0 ? void 0 : _b.trim())) {
            errors.push('Industry is required');
        }
        if (!((_c = brandData.description) === null || _c === void 0 ? void 0 : _c.trim())) {
            errors.push('Description is required');
        }
        if (!((_d = brandData.targetAudience) === null || _d === void 0 ? void 0 : _d.trim())) {
            errors.push('Target audience is required');
        }
        if (!((_e = brandData.uniqueValueProp) === null || _e === void 0 ? void 0 : _e.trim())) {
            errors.push('Unique value proposition is required');
        }
        // Locations validation
        if (!brandData.locations || !Array.isArray(brandData.locations) || brandData.locations.length === 0) {
            errors.push('At least one location is required');
        }
        else {
            brandData.locations.forEach((location, index) => {
                var _a, _b, _c, _d, _e;
                if (!((_a = location.name) === null || _a === void 0 ? void 0 : _a.trim())) {
                    errors.push(`Location ${index + 1}: Name is required`);
                }
                if (!((_b = location.phone) === null || _b === void 0 ? void 0 : _b.trim())) {
                    errors.push(`Location ${index + 1}: Phone is required`);
                }
                if (!((_c = location.address) === null || _c === void 0 ? void 0 : _c.trim())) {
                    errors.push(`Location ${index + 1}: Address is required`);
                }
                if (!((_d = location.city) === null || _d === void 0 ? void 0 : _d.trim())) {
                    errors.push(`Location ${index + 1}: City is required`);
                }
                if (!((_e = location.state) === null || _e === void 0 ? void 0 : _e.trim())) {
                    errors.push(`Location ${index + 1}: State is required`);
                }
            });
        }
        // Content topics validation
        if (!brandData.contentTopics || !Array.isArray(brandData.contentTopics) || brandData.contentTopics.length === 0) {
            errors.push('At least one content topic is required');
        }
        // Post template validation
        if (!brandData.postTemplate) {
            errors.push('Post template is required');
        }
        else {
            if (!((_f = brandData.postTemplate.structure) === null || _f === void 0 ? void 0 : _f.trim())) {
                errors.push('Post template structure is required');
            }
            if (!brandData.postTemplate.toneGuidelines || brandData.postTemplate.toneGuidelines.length === 0) {
                errors.push('Post template tone guidelines are required');
            }
        }
        // Brand voice validation
        if (!brandData.brandVoice) {
            errors.push('Brand voice is required');
        }
        else {
            if (!((_g = brandData.brandVoice.tone) === null || _g === void 0 ? void 0 : _g.trim())) {
                errors.push('Brand voice tone is required');
            }
            if (!brandData.brandVoice.personality || brandData.brandVoice.personality.length === 0) {
                errors.push('Brand voice personality traits are required');
            }
        }
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    /**
     * Create a new brand with validation
     */
    createBrand(brandData) {
        return __awaiter(this, void 0, void 0, function* () {
            const validation = this.validateBrandData(brandData);
            if (!validation.isValid) {
                const errorMessage = `Brand validation failed:\n${validation.errors.join('\n')}`;
                console.error('❌ Brand validation failed:', validation.errors);
                throw new Error(errorMessage);
            }
            // Check if brand name already exists
            const existingBrand = yield this.findBrandByName(brandData.name);
            if (existingBrand) {
                throw new Error(`Brand with name "${brandData.name}" already exists`);
            }
            try {
                const brand = yield database_js_1.default.createBrand(brandData);
                console.log(`✅ Brand created successfully: ${brand.name}`);
                return brand;
            }
            catch (error) {
                console.error('❌ Error creating brand:', error);
                throw new Error(`Failed to create brand: ${brandData.name}`);
            }
        });
    }
    /**
     * Update an existing brand with validation
     */
    updateBrand(brandId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if brand exists
            const existingBrand = yield this.getBrandDetails(brandId);
            if (!existingBrand) {
                throw new Error(`Brand with ID "${brandId}" not found`);
            }
            // Merge existing data with updates for validation
            const mergedData = Object.assign(Object.assign({}, existingBrand), updates);
            const validation = this.validateBrandData(mergedData);
            if (!validation.isValid) {
                const errorMessage = `Brand validation failed:\n${validation.errors.join('\n')}`;
                console.error('❌ Brand validation failed:', validation.errors);
                throw new Error(errorMessage);
            }
            // Check if new name conflicts with existing brands (if name is being updated)
            if (updates.name && updates.name !== existingBrand.name) {
                const nameConflict = yield this.findBrandByName(updates.name);
                if (nameConflict && nameConflict.id !== brandId) {
                    throw new Error(`Brand with name "${updates.name}" already exists`);
                }
            }
            try {
                const brand = yield database_js_1.default.updateBrand(brandId, updates);
                console.log(`✅ Brand updated successfully: ${brand.name}`);
                return brand;
            }
            catch (error) {
                console.error(`❌ Error updating brand ${brandId}:`, error);
                throw new Error(`Failed to update brand: ${brandId}`);
            }
        });
    }
    /**
     * Delete a brand with safety checks
     */
    deleteBrand(brandId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Check if brand exists
            const existingBrand = yield this.getBrandDetails(brandId);
            if (!existingBrand) {
                throw new Error(`Brand with ID "${brandId}" not found`);
            }
            // Check for associated posts
            const brandStats = yield database_js_1.default.getBrandStats(brandId);
            if (brandStats.totalPosts > 0) {
                console.log(`⚠️  Warning: Brand "${existingBrand.name}" has ${brandStats.totalPosts} associated posts that will be unlinked`);
            }
            try {
                yield database_js_1.default.deleteBrand(brandId);
                console.log(`✅ Brand deleted successfully: ${existingBrand.name}`);
            }
            catch (error) {
                console.error(`❌ Error deleting brand ${brandId}:`, error);
                throw new Error(`Failed to delete brand: ${existingBrand.name}`);
            }
        });
    }
    /**
     * Get brand context for AI content generation
     */
    getBrandContext(brandId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const brand = yield this.getBrandDetails(brandId);
                if (!brand) {
                    return null;
                }
                return {
                    brand,
                    locations: brand.locations,
                    contentTopics: brand.contentTopics,
                    brandVoice: brand.brandVoice,
                    postTemplate: brand.postTemplate,
                };
            }
            catch (error) {
                console.error(`❌ Error fetching brand context for ${brandId}:`, error);
                throw new Error(`Failed to fetch brand context for ${brandId}`);
            }
        });
    }
    /**
     * Search brands by keyword
     */
    searchBrands(keyword) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const allBrands = yield database_js_1.default.getAllBrands();
                const searchTerm = keyword.toLowerCase();
                return allBrands.filter(brand => brand.name.toLowerCase().includes(searchTerm) ||
                    brand.industry.toLowerCase().includes(searchTerm) ||
                    brand.description.toLowerCase().includes(searchTerm));
            }
            catch (error) {
                console.error(`❌ Error searching brands with keyword "${keyword}":`, error);
                throw new Error(`Failed to search brands with keyword: ${keyword}`);
            }
        });
    }
}
exports.BrandManager = BrandManager;
exports.default = new BrandManager();
