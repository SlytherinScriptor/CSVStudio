

interface StepperProps {
    steps: string[];
    currentStep: number;
}

export function Stepper({ steps, currentStep }: StepperProps) {
    return (
        <div className="stepper">
            {steps.map((label, i) => {
                const stepNum = i + 1;
                const isActive = stepNum === currentStep;
                return (
                    <div className="step" key={label}>
                        <span className={`dot ${isActive ? 'active' : ''}`}>{stepNum}</span>
                        <span>{label}</span>
                    </div>
                );
            })}
        </div>
    );
}
