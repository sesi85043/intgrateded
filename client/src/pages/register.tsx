import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  LayoutDashboard, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Loader2, 
  CheckCircle2,
  User,
  MapPin,
  Users,
  Shield,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

const registrationSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Valid phone number required"),
  departmentId: z.string().min(1, "Department is required"),
  
  addressLine1: z.string().min(1, "Street address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
  
  nextOfKin1Name: z.string().min(1, "Next of kin name is required"),
  nextOfKin1Relationship: z.string().min(1, "Relationship is required"),
  nextOfKin1Phone: z.string().min(10, "Valid phone number required"),
  nextOfKin1Email: z.string().email().optional().or(z.literal("")),
  nextOfKin1Address: z.string().optional(),
  
  nextOfKin2Name: z.string().min(1, "Second next of kin name is required"),
  nextOfKin2Relationship: z.string().min(1, "Relationship is required"),
  nextOfKin2Phone: z.string().min(10, "Valid phone number required"),
  nextOfKin2Email: z.string().email().optional().or(z.literal("")),
  nextOfKin2Address: z.string().optional(),
  
  captchaVerified: z.boolean().refine(val => val === true, "Please verify you are human"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegistrationForm = z.infer<typeof registrationSchema>;

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const COUNTRIES = [
  { code: "NG", name: "Nigeria", states: NIGERIAN_STATES },
  { code: "US", name: "United States", states: ["Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"] },
  { code: "UK", name: "United Kingdom", states: ["England", "Scotland", "Wales", "Northern Ireland"] },
  { code: "CA", name: "Canada", states: ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan"] },
  { code: "AU", name: "Australia", states: ["New South Wales", "Queensland", "South Australia", "Tasmania", "Victoria", "Western Australia"] },
];

const RELATIONSHIPS = [
  "Spouse", "Parent", "Child", "Sibling", "Uncle", "Aunt", "Cousin", "Friend", "Other"
];

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function Register() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [captchaChallenge, setCaptchaChallenge] = useState({ num1: 0, num2: 0 });
  const [captchaAnswer, setCaptchaAnswer] = useState("");

  const { data: departments = [] } = useQuery<Department[]>({
    queryKey: ["/api/public/departments"],
    queryFn: async () => {
      const response = await fetch("/api/public/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      return response.json();
    },
  });

  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      phone: "",
      departmentId: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "NG",
      nextOfKin1Name: "",
      nextOfKin1Relationship: "",
      nextOfKin1Phone: "",
      nextOfKin1Email: "",
      nextOfKin1Address: "",
      nextOfKin2Name: "",
      nextOfKin2Relationship: "",
      nextOfKin2Phone: "",
      nextOfKin2Email: "",
      nextOfKin2Address: "",
      captchaVerified: false,
    },
  });

  useEffect(() => {
    generateCaptcha();
  }, []);

  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    setCaptchaChallenge({ num1, num2 });
    setCaptchaAnswer("");
    form.setValue("captchaVerified", false);
  };

  const verifyCaptcha = () => {
    const expectedAnswer = captchaChallenge.num1 + captchaChallenge.num2;
    const isCorrect = parseInt(captchaAnswer) === expectedAnswer;
    form.setValue("captchaVerified", isCorrect);
    if (!isCorrect) {
      generateCaptcha();
    }
    return isCorrect;
  };

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationForm) => {
      const payload = {
        ...data,
        captchaToken: data.captchaVerified ? "verified" : "",
        nextOfKin1Email: data.nextOfKin1Email || undefined,
        nextOfKin2Email: data.nextOfKin2Email || undefined,
      };
      return await apiRequest("/api/auth/register", "POST", payload);
    },
    onSuccess: () => {
      setSuccess(true);
    },
    onError: (err: any) => {
      const message = err?.message || "Registration failed. Please try again.";
      setError(message);
    },
  });

  const validateStep = async (currentStep: number): Promise<boolean> => {
    let fieldsToValidate: (keyof RegistrationForm)[] = [];
    
    switch (currentStep) {
      case 1:
        fieldsToValidate = ["firstName", "lastName", "email", "phone", "password", "confirmPassword", "departmentId"];
        break;
      case 2:
        fieldsToValidate = ["addressLine1", "city", "state", "postalCode"];
        break;
      case 3:
        fieldsToValidate = ["nextOfKin1Name", "nextOfKin1Relationship", "nextOfKin1Phone"];
        break;
      case 4:
        fieldsToValidate = ["nextOfKin2Name", "nextOfKin2Relationship", "nextOfKin2Phone", "captchaVerified"];
        break;
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const nextStep = async () => {
    setError(null);
    const isValid = await validateStep(step);
    if (isValid) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setError(null);
    setStep(prev => Math.max(prev - 1, 1));
  };

  const onSubmit = async (data: RegistrationForm) => {
    setError(null);
    registerMutation.mutate(data);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <span className="text-xl font-semibold">Admin Hub</span>
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-green-600">Registration Submitted!</h2>
                <p className="text-muted-foreground">
                  Your application has been submitted successfully and is now pending approval by management.
                </p>
                <p className="text-sm text-muted-foreground">
                  You will be notified once your account has been reviewed and activated.
                </p>
                <Button onClick={() => setLocation("/login")} className="mt-4">
                  Return to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const stepTitles = [
    { icon: User, title: "Personal Information", description: "Your basic details" },
    { icon: MapPin, title: "Residential Address", description: "Where you live" },
    { icon: Users, title: "Next of Kin (1)", description: "Primary emergency contact" },
    { icon: Shield, title: "Next of Kin (2) & Verify", description: "Secondary contact & verification" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <span className="text-xl font-semibold">Admin Hub</span>
            </div>
            <Button variant="ghost" onClick={() => setLocation("/login")}>
              Already have an account? Sign In
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Staff Registration</h1>
            <p className="text-muted-foreground">Complete the form below to apply for staff access</p>
          </div>

          <div className="flex justify-between mb-8">
            {stepTitles.map((s, index) => {
              const StepIcon = s.icon;
              const isActive = step === index + 1;
              const isCompleted = step > index + 1;
              return (
                <div 
                  key={index} 
                  className={`flex flex-col items-center flex-1 ${index < stepTitles.length - 1 ? 'relative' : ''}`}
                >
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      isCompleted ? 'bg-primary border-primary text-primary-foreground' :
                      isActive ? 'border-primary text-primary bg-primary/10' :
                      'border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <span className={`text-xs mt-2 text-center ${isActive ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                  {index < stepTitles.length - 1 && (
                    <div className={`absolute top-5 left-[60%] w-[80%] h-0.5 ${isCompleted ? 'bg-primary' : 'bg-muted-foreground/30'}`} />
                  )}
                </div>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const StepIcon = stepTitles[step - 1].icon;
                  return <StepIcon className="h-5 w-5" />;
                })()}
                {stepTitles[step - 1].title}
              </CardTitle>
              <CardDescription>{stepTitles[step - 1].description}</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input
                          id="firstName"
                          {...form.register("firstName")}
                          placeholder="John"
                        />
                        {form.formState.errors.firstName && (
                          <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input
                          id="lastName"
                          {...form.register("lastName")}
                          placeholder="Doe"
                        />
                        {form.formState.errors.lastName && (
                          <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        {...form.register("email")}
                        placeholder="john.doe@company.com"
                      />
                      {form.formState.errors.email && (
                        <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        {...form.register("phone")}
                        placeholder="+234 801 234 5678"
                      />
                      {form.formState.errors.phone && (
                        <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="departmentId">Department *</Label>
                      <Select
                        value={form.watch("departmentId")}
                        onValueChange={(value) => form.setValue("departmentId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select your department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name} ({dept.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {form.formState.errors.departmentId && (
                        <p className="text-sm text-destructive">{form.formState.errors.departmentId.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          {...form.register("password")}
                          placeholder="At least 8 characters"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {form.formState.errors.password && (
                        <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          {...form.register("confirmPassword")}
                          placeholder="Repeat your password"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      {form.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">{form.formState.errors.confirmPassword.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="addressLine1">Street Address *</Label>
                      <Input
                        id="addressLine1"
                        {...form.register("addressLine1")}
                        placeholder="123 Main Street"
                      />
                      {form.formState.errors.addressLine1 && (
                        <p className="text-sm text-destructive">{form.formState.errors.addressLine1.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                      <Input
                        id="addressLine2"
                        {...form.register("addressLine2")}
                        placeholder="Apartment, suite, etc."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          {...form.register("city")}
                          placeholder="Lagos"
                        />
                        {form.formState.errors.city && (
                          <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State/Region *</Label>
                        <Select
                          value={form.watch("state")}
                          onValueChange={(value) => form.setValue("state", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select state/region" />
                          </SelectTrigger>
                          <SelectContent>
                            {(() => {
                              const selectedCountry = COUNTRIES.find(c => c.code === form.watch("country"));
                              return selectedCountry ? selectedCountry.states.map((state) => (
                                <SelectItem key={state} value={state}>
                                  {state}
                                </SelectItem>
                              )) : null;
                            })()}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.state && (
                          <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          {...form.register("postalCode")}
                          placeholder="100001"
                        />
                        {form.formState.errors.postalCode && (
                          <p className="text-sm text-destructive">{form.formState.errors.postalCode.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country *</Label>
                        <Select
                          value={form.watch("country")}
                          onValueChange={(value) => {
                            form.setValue("country", value);
                            form.setValue("state", "");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((country) => (
                              <SelectItem key={country.code} value={country.code}>
                                {country.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.country && (
                          <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg mb-4">
                      <p className="text-sm text-muted-foreground">
                        Please provide details of your primary emergency contact person.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextOfKin1Name">Full Name *</Label>
                      <Input
                        id="nextOfKin1Name"
                        {...form.register("nextOfKin1Name")}
                        placeholder="Jane Doe"
                      />
                      {form.formState.errors.nextOfKin1Name && (
                        <p className="text-sm text-destructive">{form.formState.errors.nextOfKin1Name.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nextOfKin1Relationship">Relationship *</Label>
                        <Select
                          value={form.watch("nextOfKin1Relationship")}
                          onValueChange={(value) => form.setValue("nextOfKin1Relationship", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.map((rel) => (
                              <SelectItem key={rel} value={rel}>
                                {rel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.nextOfKin1Relationship && (
                          <p className="text-sm text-destructive">{form.formState.errors.nextOfKin1Relationship.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nextOfKin1Phone">Phone Number *</Label>
                        <Input
                          id="nextOfKin1Phone"
                          {...form.register("nextOfKin1Phone")}
                          placeholder="+234 801 234 5678"
                        />
                        {form.formState.errors.nextOfKin1Phone && (
                          <p className="text-sm text-destructive">{form.formState.errors.nextOfKin1Phone.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextOfKin1Email">Email (Optional)</Label>
                      <Input
                        id="nextOfKin1Email"
                        type="email"
                        {...form.register("nextOfKin1Email")}
                        placeholder="jane.doe@email.com"
                      />
                      {form.formState.errors.nextOfKin1Email && (
                        <p className="text-sm text-destructive">{form.formState.errors.nextOfKin1Email.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextOfKin1Address">Address (Optional)</Label>
                      <Input
                        id="nextOfKin1Address"
                        {...form.register("nextOfKin1Address")}
                        placeholder="Contact's address"
                      />
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-lg mb-4">
                      <p className="text-sm text-muted-foreground">
                        Please provide details of your secondary emergency contact person.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextOfKin2Name">Full Name *</Label>
                      <Input
                        id="nextOfKin2Name"
                        {...form.register("nextOfKin2Name")}
                        placeholder="John Smith"
                      />
                      {form.formState.errors.nextOfKin2Name && (
                        <p className="text-sm text-destructive">{form.formState.errors.nextOfKin2Name.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nextOfKin2Relationship">Relationship *</Label>
                        <Select
                          value={form.watch("nextOfKin2Relationship")}
                          onValueChange={(value) => form.setValue("nextOfKin2Relationship", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.map((rel) => (
                              <SelectItem key={rel} value={rel}>
                                {rel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.nextOfKin2Relationship && (
                          <p className="text-sm text-destructive">{form.formState.errors.nextOfKin2Relationship.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="nextOfKin2Phone">Phone Number *</Label>
                        <Input
                          id="nextOfKin2Phone"
                          {...form.register("nextOfKin2Phone")}
                          placeholder="+234 801 234 5678"
                        />
                        {form.formState.errors.nextOfKin2Phone && (
                          <p className="text-sm text-destructive">{form.formState.errors.nextOfKin2Phone.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextOfKin2Email">Email (Optional)</Label>
                      <Input
                        id="nextOfKin2Email"
                        type="email"
                        {...form.register("nextOfKin2Email")}
                        placeholder="john.smith@email.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nextOfKin2Address">Address (Optional)</Label>
                      <Input
                        id="nextOfKin2Address"
                        {...form.register("nextOfKin2Address")}
                        placeholder="Contact's address"
                      />
                    </div>

                    <div className="border-t pt-4 mt-6">
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <Label className="text-base font-medium">Human Verification *</Label>
                          <p className="text-sm text-muted-foreground mt-1 mb-3">
                            Please solve this simple math problem to verify you are human:
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="bg-background px-4 py-2 rounded border font-mono text-lg">
                              {captchaChallenge.num1} + {captchaChallenge.num2} = ?
                            </div>
                            <Input
                              type="number"
                              value={captchaAnswer}
                              onChange={(e) => setCaptchaAnswer(e.target.value)}
                              placeholder="Answer"
                              className="w-24"
                            />
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={verifyCaptcha}
                              disabled={!captchaAnswer}
                            >
                              Verify
                            </Button>
                            {form.watch("captchaVerified") && (
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            )}
                          </div>
                          {form.formState.errors.captchaVerified && (
                            <p className="text-sm text-destructive mt-2">{form.formState.errors.captchaVerified.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={step === 1}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  {step < 4 ? (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={registerMutation.isPending || !form.watch("captchaVerified")}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Submit Application
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
