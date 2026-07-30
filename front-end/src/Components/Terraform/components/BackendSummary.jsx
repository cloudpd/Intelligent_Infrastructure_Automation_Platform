import React from 'react';

export default function BackendSummary({ state }) {
  return (
    <>
      <h2 className='terraform-step-title'>Backend</h2>
      <p className='terraform-readonly-row'>
        <strong>S3 Bucket:</strong> {state.s3Bucket}
      </p>
      <p className='terraform-readonly-row'>
        <strong>Registry:</strong> {state.useEcr ? 'AWS ECR' : 'GitHub Container Registry'}
      </p>
      <p className='terraform-readonly-row'>
        <strong>Configured</strong>
      </p>
    </>
  );
}