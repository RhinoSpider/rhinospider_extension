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
        // TODO: In production, this will make an actual call to OpenAI
        // For now, we'll simulate the extraction process
        let extractedValue = await mockExtract(content, field, context);
        
        // Validate the extracted value
        let validationResult = validateField(extractedValue, field);
        
        if (not validationResult.isValid) {
            return #err(validationResult.message);
        };

        #ok(extractedValue)
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
                // Additional validation could be added here
                return { isValid = true; message = "" };
            };
        };

        { isValid = true; message = "" }
    };

    // Mock extraction function for local testing
    private func mockExtract(content: Text, field: Types.ScrapingField, context: ?Text) : async Text {
        let contextStr = switch (context) {
            case (?c) { c };
            case null { "" };
        };
        
        Debug.print("Extracting field: " # field.name);
        Debug.print("Context: " # contextStr);
        Debug.print("Content length: " # Int.toText(Text.size(content)));
        
        // Return mock data based on field type
        switch (field.fieldType) {
            case "number" { "42" };
            case "date" { "2024-02-12" };
            case _ { "Mock value for " # field.name };
        }
    };
};
