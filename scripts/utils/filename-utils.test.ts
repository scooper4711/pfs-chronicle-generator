import { sanitizeFilename, generateChronicleFilename } from './filename-utils';

describe('filename-utils', () => {
    describe('sanitizeFilename', () => {
        it('should replace invalid characters with underscores', () => {
            expect(sanitizeFilename("John's Character!.pdf")).toBe("John_s_Character_.pdf");
        });

        it('should preserve valid characters (alphanumeric, dots, hyphens, underscores)', () => {
            expect(sanitizeFilename("valid-file_name.123.pdf")).toBe("valid-file_name.123.pdf");
        });

        it('should replace spaces with underscores', () => {
            expect(sanitizeFilename("My Character Name.pdf")).toBe("My_Character_Name.pdf");
        });

        it('should replace special characters with underscores', () => {
            expect(sanitizeFilename("Chronicle #1-2.pdf")).toBe("Chronicle__1-2.pdf");
        });

        it('should handle empty string', () => {
            expect(sanitizeFilename("")).toBe("");
        });
    });

    describe('generateChronicleFilename', () => {
        it('should combine actor name and chronicle filename', () => {
            const result = generateChronicleFilename(
                "Valeros the Fighter",
                "modules/pfs-chronicles/season-1/1-01.pdf"
            );
            expect(result).toBe("Valeros_the_Fighter_1-01.pdf");
        });

        it('should sanitize both actor name and chronicle filename', () => {
            const result = generateChronicleFilename(
                "John's Character!",
                "modules/pfs-chronicles/season-1/Chronicle #1.pdf"
            );
            expect(result).toBe("John_s_Character__Chronicle__1.pdf");
        });

        it('should handle path with no directory separators', () => {
            const result = generateChronicleFilename(
                "Test Character",
                "chronicle.pdf"
            );
            expect(result).toBe("Test_Character_chronicle.pdf");
        });

        it('should use default filename when path is empty', () => {
            const result = generateChronicleFilename(
                "Test Character",
                ""
            );
            expect(result).toBe("Test_Character_chronicle.pdf");
        });

        it('should handle path ending with slash', () => {
            const result = generateChronicleFilename(
                "Test Character",
                "modules/pfs-chronicles/"
            );
            expect(result).toBe("Test_Character_chronicle.pdf");
        });
    });
});
