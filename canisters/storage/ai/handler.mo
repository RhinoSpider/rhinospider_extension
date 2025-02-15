import Result "mo:base/Result";
import Text "mo:base/Text";
import Error "mo:base/Error";
import Types "../types";
import Debug "mo:base/Debug";
import Int "mo:base/Int";

module {
    public type ValidationResult = {
        isValid: Bool;
        message: Text;
    };

    // Extract and validate a field based on its properties
    public func extractField(content: Text, field: Types.ScrapingField, context: ?Text) : async Result.Result<Text, Text> {
        Debug.print("Extracting field: " # field.name);
        
        // For now, return mock data based on field type and name
        let mockValue = switch (field.fieldType, field.name) {
            case ("title", _) { "Sample Article Title" };
            case ("date", _) { "2025-02-15" };
            case ("author", _) { "John Doe" };
            case ("votes", _) { "42" };
            case ("description", _) { "This is a sample description for testing purposes." };
            case (_, _) { "Sample value for " # field.name };
        };

        // Validate the extracted value
        let validationResult = validateField(mockValue, field);
        if (not validationResult.isValid) {
            return #err(validationResult.message);
        };

        #ok(mockValue)
    };

    // Validate extracted value based on field properties
    private func validateField(value: Text, field: Types.ScrapingField) : ValidationResult {
        // Check if required field is empty
        if (field.required and Text.size(value) == 0) {
            return {
                isValid = false;
                message = "Required field '" # field.name # "' cannot be empty";
            };
        };

        // Validate based on fieldType
        switch (field.fieldType) {
            case "number" {
                // Check if value is a valid number
                for (c in Text.toIter(value)) {
                    if (not (c >= '0' and c <= '9')) {
                        return {
                            isValid = false;
                            message = "Field '" # field.name # "' must be a valid number";
                        };
                    };
                };
            };
            case "date" {
                // Basic date validation (you can make this more sophisticated)
                if (Text.size(value) < 8) {  // Minimum date format: YYYYMMDD
                    return {
                        isValid = false;
                        message = "Field '" # field.name # "' must be a valid date";
                    };
                };
            };
            case _ {  // "text" and other types
                // For text fields, just ensure non-empty if required
                return { isValid = true; message = "" };
            };
        };

        { isValid = true; message = "" }
    };
};
