import { ShiningText } from '@/components/ui/shining-text';
import { AIInput } from '@/components/ui/ai-input';

const Demo = () => {
    return <ShiningText text={'HextaAI is thinking...'} />;
};

const AIInputDemo = () => {
    return (
        <div className="space-y-8 min-w-[400px]">
            <div>
                <AIInput onSubmit={(value) => console.log('Submitted:', value)} />
            </div>
        </div>
    );
};

export { Demo, AIInputDemo };
