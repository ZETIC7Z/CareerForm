import { PDS, scalarFields, questions } from './model';

export function validateStep(section: number, signing: boolean, data: PDS): Record<string, string> {
  const errors: Record<string, string> = {};

  if (section === 0) {
    // Personal information
    const requiredKeys = [
      'surname',
      'firstName',
      'birthDate',
      'birthPlace',
      'sex',
      'civilStatus',
      'citizenship',
      'residentialCity',
      'residentialProvince',
      'mobile'
    ];

    for (const key of requiredKeys) {
      if (!data.values[key]?.trim()) {
        const field = scalarFields.find(f => f.key === key);
        errors[key] = `${field?.label || key} is required. Please fill this out or enter N/A.`;
      }
    }

    // Middle name validation
    const mid = data.values.middleName?.trim();
    if (!mid) {
      errors['middleName'] = 'Enter full middle name or check "No middle name".';
    } else if (mid !== 'N/A' && /^[a-zA-Z]\.?$/.test(mid)) {
      errors['middleName'] = 'CSC requires full middle name (e.g. Santos), not an initial.';
    }

    // Email format validation if provided
    if (data.values.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.values.email.trim())) {
      errors['email'] = 'Please enter a valid email address.';
    }
  } else if (section === 8 && !signing) {
    // Declarations (Questions 34–40)
    for (const q of questions) {
      const ans = data.values[q.key];
      if (!ans) {
        errors[q.key] = `Please answer Question ${q.key.slice(1)} (Yes or No).`;
      } else if (ans === 'Yes' && !data.values[q.key + 'Details']?.trim()) {
        errors[q.key + 'Details'] = `Please provide details for Question ${q.key.slice(1)}.`;
      }
    }
  } else if (section === 8 && signing) {
    // Signing & references
    if (!data.signature) {
      errors['signature'] = 'Please affix your official e-signature.';
    }
    if (!data.photo) {
      errors['photo'] = 'Please upload a 4.5 cm × 3.5 cm passport photo.';
    }
  }

  return errors;
}
