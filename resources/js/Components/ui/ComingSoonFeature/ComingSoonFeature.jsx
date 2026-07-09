import React from 'react';
import { Clock, HardHat } from 'lucide-react';
import EmptyState from '../EmptyState';
import Card from '../Card';

export default function ComingSoonFeature({ 
    title, 
    description, 
    dependsOn = [], 
    plannedFields = [] 
}) {
    const renderAction = () => {
        return (
            <div style={{ marginTop: '1.5rem', textAlign: 'left', backgroundColor: 'var(--bg-light)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <HardHat size={18} color="var(--primary-navy)" />
                    <span style={{ fontWeight: '600', color: 'var(--primary-navy)' }}>Under Construction</span>
                </div>
                
                {dependsOn.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Dependencies:</div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {dependsOn.map((dep, idx) => (
                                <span key={idx} className="badge badge-info">{dep}</span>
                            ))}
                        </div>
                    </div>
                )}

                {plannedFields.length > 0 && (
                    <div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>What this will include:</div>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            {plannedFields.map((field, idx) => (
                                <li key={idx}>{field}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card style={{ borderStyle: 'dashed', borderWidth: '2px', padding: '1rem' }}>
            <EmptyState 
                icon={Clock} 
                title={`${title} (Coming Soon)`} 
                message={description}
                action={renderAction()}
            />
        </Card>
    );
}
