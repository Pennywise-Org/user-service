import { z } from 'zod';

const phoneRegex = /^(\+1\s?)?(\([2-9][0-9]{2}\)|[2-9][0-9]{2})[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}$/;

export const userProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(50).optional(),
  lastName: z.string().trim().min(1).max(50).optional(),
  phoneNumber: z.string().regex(phoneRegex, 'Invalid US phone number format').optional(),
  dateofBirth: z.coerce.date().optional(),
  street: z.string().max(128).optional(),
  city: z.string().max(128).optional(),
  state: z.string().max(128).optional(),
  country: z.string().max(128).optional(),
  postalCode: z.string().max(5).optional(),
  annualIncome: z.number().nonnegative().optional(),
  riskTolerance: z.enum(['Low', 'Medium', 'High']).optional(),
  ssn: z.string().max(9).optional(),
});

export type userProfile = z.infer<typeof userProfileSchema>;
